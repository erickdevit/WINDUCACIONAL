const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

module.exports = function injectAttendanceRoutes(ctx) {
  const {
    ATTENDANCE_TIME_ZONE,
    app,
    getDateList,
    getDefaultDateRange,
    getExpectedDatesForSchedule,
    getStudentAttendanceSchedule,
    isRecordInsideSchedule,
    normalizeDateParam,
    pool,
    publicAttendanceRecord,
    requireAuth,
    requireProfessor,
  } = ctx;

  app.get("/api/attendance/me", requireAuth, async (req, res, next) => {
    try {
      if (req.user.role !== "aluno") {
        return res.status(403).json({
          error: "Histórico individual disponível apenas para alunos.",
        });
      }

      const result = await pool.query(
        `SELECT ar.id,
              ar.user_id,
              to_char(ar.attendance_date, 'YYYY-MM-DD') AS attendance_date,
              ar.first_login_at,
              ar.last_login_at,
              ar.login_count,
              u.username,
              u.display_name,
              COALESCE(ar.turma_id, u.turma_id) AS turma_id,
              t.nome AS turma_nome,
              t.student_type AS class_type
       FROM attendance_records ar
       JOIN users u ON u.id = ar.user_id
       LEFT JOIN turmas t ON t.id = COALESCE(ar.turma_id, u.turma_id)
       WHERE ar.user_id = $1
         AND (ar.turma_id IS NULL OR ar.turma_id NOT IN (SELECT id FROM turmas WHERE student_type = 'reposicao'))
       ORDER BY ar.attendance_date DESC
       LIMIT 90`,
        [req.user.id]
      );

      const records = result.rows.map(publicAttendanceRecord);
      const todayResult = await pool.query(
        "SELECT to_char((NOW() AT TIME ZONE $1)::date, 'YYYY-MM-DD') AS today",
        [ATTENDANCE_TIME_ZONE]
      );
      const today = todayResult.rows[0].today;

      res.json({
        today,
        todayRecord:
          records.find((record) => record.attendanceDate === today) || null,
        records,
      });
    } catch (error) {
      next(error);
    }
  });

  app.get(
    "/api/attendance/summary",
    requireAuth,
    requireProfessor,
    async (req, res, next) => {
      try {
        const defaults = getDefaultDateRange();
        const startDate =
          normalizeDateParam(req.query.startDate) || defaults.startDate;
        const endDate =
          normalizeDateParam(req.query.endDate) || defaults.endDate;
        const turmaId = req.query.turmaId || "";

        if (startDate > endDate) {
          return res
            .status(400)
            .json({ error: "Data inicial não pode ser maior que a final." });
        }

        const days = getDateList(startDate, endDate);
        if (days.length > 366) {
          return res.status(400).json({
            error: "O período de frequência não pode passar de 366 dias.",
          });
        }

        let isReposicao = false;
        if (turmaId) {
          const turmaCheck = await pool.query(
            "SELECT student_type FROM turmas WHERE id = $1",
            [turmaId]
          );
          if (
            turmaCheck.rowCount > 0 &&
            turmaCheck.rows[0].student_type === "reposicao"
          ) {
            isReposicao = true;
          }
        }

        let studentsResult;
        if (isReposicao) {
          studentsResult = await pool.query(
            `SELECT DISTINCT u.id,
                  u.username,
                  u.display_name,
                  u.turma_id,
                  t.nome AS turma_nome,
                  NULL::smallint[] AS schedule_days,
                  '00:00'::time AS schedule_start_time,
                  '23:59'::time AS schedule_end_time
           FROM users u
           JOIN attendance_records ar ON ar.user_id = u.id
           LEFT JOIN turmas t ON t.id = u.turma_id
           WHERE u.role = 'aluno' AND u.active = TRUE
             AND ar.turma_id = $1
           ORDER BY u.display_name ASC`,
            [turmaId]
          );
        } else {
          const studentParams = [];
          let studentFilter = "WHERE u.role = 'aluno' AND u.active = TRUE";
          if (turmaId) {
            studentParams.push(turmaId);
            studentFilter += ` AND u.turma_id = $${studentParams.length}`;
          }
          studentsResult = await pool.query(
            `SELECT u.id,
                  u.username,
                  u.display_name,
                  u.turma_id,
                  t.nome AS turma_nome,
                  t.schedule_days,
                  t.schedule_start_time,
                  t.schedule_end_time
           FROM users u
           LEFT JOIN turmas t ON t.id = u.turma_id
           ${studentFilter}
           ORDER BY t.nome ASC NULLS LAST, u.display_name ASC`,
            studentParams
          );
        }

        const recordParams = [startDate, endDate];
        let recordFilter = "WHERE ar.attendance_date BETWEEN $1 AND $2";
        if (turmaId) {
          recordParams.push(turmaId);
          if (isReposicao) {
            recordFilter += ` AND ar.turma_id = $${recordParams.length}`;
          } else {
            recordFilter += ` AND (ar.turma_id = $${recordParams.length} OR (ar.turma_id IS NULL AND u.turma_id = $${recordParams.length}))`;
          }
        }

        const recordsResult = await pool.query(
          `SELECT ar.id,
                ar.user_id,
                to_char(ar.attendance_date, 'YYYY-MM-DD') AS attendance_date,
                ar.first_login_at,
                ar.last_login_at,
                ar.login_count,
                u.username,
                u.display_name,
                COALESCE(ar.turma_id, u.turma_id) AS turma_id,
                t.nome AS turma_nome,
                t.student_type AS class_type
         FROM attendance_records ar
         JOIN users u ON u.id = ar.user_id
         LEFT JOIN turmas t ON t.id = COALESCE(ar.turma_id, u.turma_id)
         ${recordFilter}
         ORDER BY ar.attendance_date DESC, u.display_name ASC`,
          recordParams
        );

        const recordsMapped = recordsResult.rows.map(publicAttendanceRecord);
        const records = isReposicao
          ? recordsMapped
          : recordsMapped.filter((r) => r.classType !== "reposicao");
        const recordsByStudent = new Map();
        records.forEach((record) => {
          if (!recordsByStudent.has(record.userId)) {
            recordsByStudent.set(record.userId, []);
          }
          recordsByStudent.get(record.userId).push(record);
        });

        const dailyMap = new Map(
          days.map((date) => [
            date,
            {
              date,
              expected: 0,
              present: 0,
              absent: 0,
              attendanceRate: 0,
            },
          ])
        );

        let totalPossible = 0;
        let totalPresences = 0;

        const students = studentsResult.rows.map((student) => {
          const schedule = getStudentAttendanceSchedule(student);
          const expectedDates = isReposicao
            ? (recordsByStudent.get(student.id) || []).map(
                (r) => r.attendanceDate
              )
            : getExpectedDatesForSchedule(days, schedule);
          const expectedDateSet = new Set(expectedDates);
          expectedDates.forEach((date) => {
            const day = dailyMap.get(date);
            if (day) day.expected += 1;
          });

          const studentRecords = recordsByStudent.get(student.id) || [];
          const presentDays = new Set(
            studentRecords
              .filter(
                (record) =>
                  expectedDateSet.has(record.attendanceDate) &&
                  (isReposicao || isRecordInsideSchedule(record, schedule))
              )
              .map((record) => record.attendanceDate)
          ).size;
          const absentDays = Math.max(expectedDates.length - presentDays, 0);
          totalPossible += expectedDates.length;
          totalPresences += presentDays;

          studentRecords.forEach((record) => {
            if (
              expectedDateSet.has(record.attendanceDate) &&
              (isReposicao || isRecordInsideSchedule(record, schedule))
            ) {
              const day = dailyMap.get(record.attendanceDate);
              if (day) day.present += 1;
            }
          });

          const lastLoginAt = studentRecords.reduce(
            (latest, record) =>
              !latest || new Date(record.lastLoginAt) > new Date(latest)
                ? record.lastLoginAt
                : latest,
            null
          );

          return {
            id: student.id,
            username: student.username,
            displayName: student.display_name,
            turmaId: student.turma_id || null,
            turmaNome: student.turma_nome || "",
            presentDays,
            absentDays,
            attendanceRate:
              expectedDates.length > 0
                ? Math.round((presentDays / expectedDates.length) * 100)
                : 0,
            lastLoginAt,
            records: studentRecords,
          };
        });

        const daily = Array.from(dailyMap.values())
          .filter((day) => day.expected > 0)
          .map((day) => ({
            ...day,
            absent: Math.max(day.expected - day.present, 0),
            attendanceRate:
              day.expected > 0
                ? Math.round((day.present / day.expected) * 100)
                : 0,
          }));

        const totalAbsences = Math.max(totalPossible - totalPresences, 0);

        res.json({
          range: { startDate, endDate, totalDays: daily.length },
          totals: {
            students: students.length,
            presences: totalPresences,
            absences: totalAbsences,
            attendanceRate:
              totalPossible > 0
                ? Math.round((totalPresences / totalPossible) * 100)
                : 0,
          },
          students,
          daily,
          records,
        });
      } catch (error) {
        next(error);
      }
    }
  );

  app.post(
    "/api/attendance/register",
    requireAuth,
    requireProfessor,
    async (req, res, next) => {
      let client;
      try {
        const { date, turmaId, students } = req.body;
        if (!date || !turmaId || !Array.isArray(students)) {
          return res.status(400).json({ error: "Parâmetros inválidos." });
        }

        client = await pool.connect();
        await client.query("BEGIN");

        for (const student of students) {
          if (student.isPresent) {
            await client.query(
              `INSERT INTO attendance_records
               (id, user_id, attendance_date, first_login_at, last_login_at, login_count, source, turma_id)
             VALUES ($1, $2, $3, NOW(), NOW(), 1, 'manual', $4)
             ON CONFLICT (user_id, attendance_date)
             DO UPDATE SET first_login_at = COALESCE(attendance_records.first_login_at, NOW()),
                           last_login_at = NOW(),
                           source = 'manual',
                           turma_id = EXCLUDED.turma_id`,
              [crypto.randomUUID(), student.id, date, turmaId]
            );
          } else {
            // Quando o professor marca "Ausente", apagamos o registro do dia
            // Mas apenas se o registro for da turma que está sendo modificada (para não apagar presenças de outras turmas no mesmo dia)
            await client.query(
              `DELETE FROM attendance_records
             WHERE user_id = $1 AND attendance_date = $2 AND (turma_id = $3 OR turma_id IS NULL)`,
              [student.id, date, turmaId]
            );
          }
        }

        await client.query("COMMIT");
        res.status(204).end();
      } catch (error) {
        await client?.query("ROLLBACK").catch(() => {});
        next(error);
      } finally {
        if (client) client.release();
      }
    }
  );
};
