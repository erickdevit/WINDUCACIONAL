import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// O backend foi modularizado: index.cjs concentra config, helpers e a
// composicao, e cada dominio registra suas rotas em server/routes/*.cjs.
// As verificacoes de contrato abaixo inspecionam o backend inteiro, entao
// concatenamos index.cjs com os modulos de rota (index primeiro para preservar
// a ordem das definicoes compartilhadas usada por algumas buscas).
const serverDir = path.resolve(__dirname, "../server");
const routesDir = path.join(serverDir, "routes");
const routeFiles = fs
  .readdirSync(routesDir)
  .filter((file) => file.endsWith(".cjs"))
  .sort()
  .map((file) => path.join(routesDir, file));
const serverCode = [path.join(serverDir, "index.cjs"), ...routeFiles]
  .map((file) => fs.readFileSync(file, "utf8"))
  .join("\n");
const pvpServerPath = path.resolve(__dirname, "../server/typingPvp.cjs");
const pvpServerCode = fs.readFileSync(pvpServerPath, "utf8");

describe("Backend - publicUser", () => {
  it("deve incluir turmaId no objeto público de usuário", () => {
    // O publicUser deve mapear turma_id para turmaId
    expect(serverCode).toContain("turmaId: user.turma_id");
  });

  it("deve incluir studentType no objeto público de usuário", () => {
    expect(serverCode).toContain("studentType: user.student_type");
  });

  it("deve permitir ao usuário atualizar o próprio nome normalizado", () => {
    expect(serverCode).toContain('"/api/auth/me/display-name"');
    expect(serverCode).toContain("normalizeDisplayName");
    expect(serverCode).toContain("SET display_name = $1");
  });
});

describe("Backend - queries SQL de usuário", () => {
  it("deve selecionar turma_id e student_type em todas as queries de listagem de usuários", () => {
    // listUsers
    const listUsersMatch = serverCode.match(
      /SELECT.*FROM users u\s+.*ORDER BY u\.role/s
    );
    expect(listUsersMatch).not.toBeNull();
    expect(listUsersMatch[0]).toContain("turma_id");
    expect(listUsersMatch[0]).toContain("student_type");
  });

  it("deve selecionar turma_id e student_type na query de autenticação (requireAuth)", () => {
    // A query requireAuth inclui os campos públicos no SELECT antes do FROM sessions
    const fromPos = serverCode.indexOf("FROM sessions s");
    expect(fromPos).toBeGreaterThan(-1);
    // Capturar do SELECT (antes do FROM) até depois do JOIN
    const authBlock = serverCode.substring(
      Math.max(0, fromPos - 300),
      fromPos + 200
    );
    expect(authBlock).toContain("turma_id");
    expect(authBlock).toContain("student_type");
  });

  it("deve selecionar turma_id e student_type na query de login", () => {
    const loginBlock = serverCode.substring(
      serverCode.indexOf("/api/auth/login"),
      serverCode.indexOf("/api/auth/login") + 500
    );
    expect(loginBlock).toContain("turma_id");
    expect(loginBlock).toContain("student_type");
  });

  it("deve incluir turma_id e student_type no INSERT de createUser", () => {
    const createBlock = serverCode.substring(
      serverCode.indexOf("INSERT INTO users"),
      serverCode.indexOf("INSERT INTO users") + 300
    );
    expect(createBlock).toContain("turma_id");
    expect(createBlock).toContain("student_type");
  });

  it("deve incluir turma_id e student_type no RETURNING do UPDATE de usuário", () => {
    const updateBlock = serverCode.substring(
      serverCode.indexOf('"/api/users/:id"'),
      serverCode.indexOf('"/api/users/:id"') + 3000
    );
    expect(updateBlock).toContain("turma_id");
    expect(updateBlock).toContain("student_type");
  });

  it("deve validar o tipo de aluno Kids ou Normal", () => {
    expect(serverCode).toContain("normalizeStudentType");
    expect(serverCode).toContain('"kids", "normal"');
  });
});

describe("Backend - endpoints de turmas", () => {
  it("deve ter endpoint GET /api/turmas", () => {
    expect(serverCode).toContain('"/api/turmas"');
    expect(serverCode).toContain(
      "SELECT id, nome, code, student_type, schedule_days"
    );
    expect(serverCode).toContain("publicTurma");
  });

  it("deve ter endpoint POST /api/turmas", () => {
    expect(serverCode).toContain("INSERT INTO turmas");
    expect(serverCode).toContain("ensureTurmaCode");
    expect(serverCode).toContain("generateTurmaCode");
  });

  it("deve ter endpoint PATCH /api/turmas/:id", () => {
    expect(serverCode).toContain('"/api/turmas/:id"');
    expect(serverCode).toContain("UPDATE turmas SET");
    expect(serverCode).toContain(
      "RETURNING id, nome, code, student_type, schedule_days"
    );
  });

  it("deve ter endpoint DELETE /api/turmas/:id", () => {
    expect(serverCode).toContain("DELETE FROM turmas");
  });

  it("deve desvincular usuários antes de excluir turma", () => {
    const deleteBlock = serverCode.substring(
      serverCode.indexOf("DELETE FROM turmas"),
      serverCode.indexOf("DELETE FROM turmas") + 200
    );
    // O UPDATE users SET turma_id = NULL deve vir antes do DELETE
    const unlinkPos = serverCode.indexOf(
      "UPDATE users SET turma_id = NULL WHERE turma_id"
    );
    const deletePos = serverCode.indexOf("DELETE FROM turmas");
    expect(unlinkPos).toBeGreaterThan(-1);
    expect(unlinkPos).toBeLessThan(deletePos);
  });
});

describe("Backend - frequência", () => {
  it("deve registrar presença automaticamente ao criar sessão de aluno", () => {
    expect(serverCode).toContain("recordAttendanceForLogin");
    expect(serverCode).toContain("INSERT INTO attendance_records");
    expect(serverCode).toContain("WHERE u.id = $1 AND u.role = 'aluno'");
    expect(serverCode).toContain("EXTRACT(DOW FROM NOW() AT TIME ZONE $3)");
    expect(serverCode).toContain("t.schedule_start_time");
    expect(serverCode).toContain("ON CONFLICT (user_id, attendance_date)");
    expect(serverCode).toContain("await recordAttendanceForLogin(userId)");
  });

  it("deve expor resumo de frequência apenas para professores", () => {
    expect(serverCode).toContain('"/api/attendance/summary"');
    expect(serverCode).toContain("requireProfessor");
    expect(serverCode).toContain("attendanceRate");
    expect(serverCode).toContain("totalDays");
    expect(serverCode).toContain("getExpectedDatesForSchedule");
    expect(serverCode).toContain("isRecordInsideSchedule");
  });

  it("deve permitir que aluno consulte apenas a própria frequência", () => {
    expect(serverCode).toContain('"/api/attendance/me"');
    expect(serverCode).toContain("WHERE ar.user_id = $1");
    expect(serverCode).toContain("req.user.id");
  });
});

describe("Backend - apostilas", () => {
  it("deve ler apostilas da pasta interna do app", () => {
    expect(serverCode).toContain("bookletLibraryDir");
    expect(serverCode).toContain('"booklets"');
    expect(serverCode).toContain('"library"');
  });

  it("deve expor catálogo e permissões de módulos com autenticação", () => {
    expect(serverCode).toContain('"/api/booklets/modules"');
    expect(serverCode).toContain('"/api/booklets/modules/access"');
    expect(serverCode).toContain('"/api/booklets/student-access"');
    expect(serverCode).toContain("requireProfessor");
    expect(serverCode).toContain("booklet_module_access");
    expect(serverCode).toContain("booklet_student_module_access");
  });

  it("deve servir PDF apenas por módulo e arquivo validados", () => {
    expect(serverCode).toContain(
      '"/api/booklets/modules/:moduleId/files/:fileId/pdf"'
    );
    expect(serverCode).toContain("findBookletFile");
    expect(serverCode).toContain("application/pdf");
    expect(serverCode).toContain("Esta apostila ainda não foi liberada");
  });

  it("deve permitir liberação específica de módulos para alunos", () => {
    expect(serverCode).toContain("listBookletStudentAccess");
    expect(serverCode).toContain("userIds");
    expect(serverCode).toContain("moduleIds");
    expect(serverCode).toContain("WHERE user_id = $1 AND module_id = ANY");
  });
});

describe("Backend - cadastro público de aluno", () => {
  it("deve ter endpoint POST /api/auth/register", () => {
    expect(serverCode).toContain('"/api/auth/register"');
    expect(serverCode).toContain("turmaCode");
    expect(serverCode).toContain('role: "aluno"');
    expect(serverCode).toContain("setSessionCookie(req, res, token)");
  });

  it("deve verificar disponibilidade de username antes de criar perfil", () => {
    expect(serverCode).toContain("isUsernameAvailable");
    expect(serverCode).toContain(
      '"/api/users/username/:username/availability"'
    );
    expect(serverCode).toContain("Já existe um usuário com esse nome.");
  });
});

describe("Backend - avaliações", () => {
  it("deve calcular notas no servidor sem confiar em pontuação do cliente", () => {
    expect(serverCode).toContain("gradePracticalRules");
    expect(serverCode).toContain(
      "pointsAwarded = isCorrect ? Number(question.points || 0) : 0"
    );
    expect(serverCode).not.toContain(
      "const { questionId, answerText, isCorrect, pointsAwarded } = ans"
    );
  });

  it("deve exigir atribuição para aluno abrir ou enviar prova", () => {
    const detailsBlock = serverCode.substring(
      serverCode.indexOf('app.get("/api/exams/:id"'),
      serverCode.search(/app\.put\(\s*"\/api\/exams\/:id"/)
    );
    const submitBlock = serverCode.substring(
      serverCode.indexOf('app.post("/api/exams/:id/submit"'),
      serverCode.search(/app\.get\(\s*"\/api\/exams\/:id\/submissions"/)
    );

    expect(detailsBlock).toContain("ensureExamAccess");
    expect(detailsBlock).toContain('forSubmit: req.user.role !== "professor"');
    expect(submitBlock).toContain("ensureExamAccess");
    expect(serverCode).toContain("Esta prova não foi atribuída ao aluno.");
  });

  it("deve gravar o nome confirmado do aluno na submissão", () => {
    const submitBlock = serverCode.substring(
      serverCode.indexOf('app.post("/api/exams/:id/submit"'),
      serverCode.search(/app\.get\(\s*"\/api\/exams\/:id\/submissions"/)
    );

    expect(submitBlock).toContain("student_display_name");
    expect(submitBlock).toContain(
      "normalizeDisplayName(req.user.display_name)"
    );
    expect(serverCode).toContain("normalizeExistingDisplayNames");
  });

  it("deve publicar apenas provas com questões", () => {
    const publishBlock = serverCode.substring(
      serverCode.indexOf('"/api/exams/:id/publish"'),
      serverCode.indexOf('"/api/exams/assign-batch"')
    );

    expect(publishBlock).toContain("EXISTS (SELECT 1 FROM exam_questions");
    expect(publishBlock).toContain("Prova não encontrada ou sem questões.");
  });

  it("deve registrar e consultar rastreabilidade de aplicações", () => {
    expect(serverCode).toContain('"/api/exams/applications"');
    expect(serverCode).toContain("publicExamApplication");
    expect(serverCode).toContain("exam_application_batches");
    expect(serverCode).toContain("exam_application_items");
    expect(serverCode).toContain("total_created");
    expect(serverCode).toContain("total_existing");
    expect(serverCode).toContain("total_skipped");
    expect(serverCode).toContain('"/api/exams/applications/:id"');
    expect(serverCode).toContain("total_removed");
    expect(serverCode).toContain("removal_status = 'removed'");
    expect(serverCode).toContain("O aluno já iniciou ou concluiu esta prova.");
  });
});

describe("Backend - ranking de digitação", () => {
  it("deve permitir que professor zere ranking por código de turma", () => {
    const resetBlock = serverCode.substring(
      serverCode.indexOf("/api/typing/ranking/turma/reset"),
      serverCode.indexOf("/api/typing/ranking/turma/reset") + 1800
    );
    expect(resetBlock).toContain("requireProfessor");
    expect(resetBlock).toContain("normalizeTurmaCode");
    expect(resetBlock).toContain("DELETE FROM typing_scores");
    expect(resetBlock).toContain("SELECT id FROM users WHERE turma_id");
  });

  it("deve separar rankings de digitação por tipo de aluno", () => {
    const globalBlock = serverCode.substring(
      serverCode.indexOf('"/api/typing/ranking/global"'),
      serverCode.indexOf('"/api/typing/ranking/global"') + 500
    );
    expect(globalBlock).toContain("normalizeTypingStudentType");
    expect(globalBlock).toContain("WHERE student_type = $1");

    const ownTurmaBlock = serverCode.substring(
      serverCode.indexOf('"/api/typing/ranking/turma"'),
      serverCode.indexOf('"/api/typing/ranking/turma"') + 650
    );
    expect(ownTurmaBlock).toContain(
      "WHERE turma_id = $1 AND student_type = $2"
    );
    expect(ownTurmaBlock).toContain("req.user.student_type");

    const turmaByIdBlock = serverCode.substring(
      serverCode.indexOf('"/api/typing/ranking/turma/:id"'),
      serverCode.indexOf('"/api/typing/ranking/turma/:id"') + 650
    );
    expect(turmaByIdBlock).toContain("requireProfessor");
    expect(turmaByIdBlock).toContain(
      "SELECT student_type FROM turmas WHERE id = $1"
    );
    expect(turmaByIdBlock).toContain(
      "WHERE turma_id = $1 AND student_type = $2"
    );
  });

  it("deve limitar reset de ranking ao tipo definido pela turma", () => {
    const resetBlock = serverCode.substring(
      serverCode.indexOf("/api/typing/ranking/turma/reset"),
      serverCode.indexOf("/api/typing/ranking/turma/reset") + 1800
    );
    expect(resetBlock).toContain(
      "SELECT id, nome, code, student_type FROM turmas WHERE code = $1"
    );
    expect(resetBlock).toContain(
      "SELECT id FROM users WHERE turma_id = $1 AND student_type = $2"
    );
    expect(resetBlock).toContain("turma.student_type");
  });

  it("deve ter endpoints para configurações de dificuldade e eventos em tempo real", () => {
    expect(serverCode).toContain('"/api/typing/settings/:studentType"');
    expect(serverCode).toContain('"/api/typing/settings/events"');
    expect(serverCode).toContain("saveTypingSettings");
    expect(serverCode).toContain("broadcastTypingSettings");
    expect(serverCode).toContain("text/event-stream");
    expect(serverCode).toContain("writeTypingSettingsEvent");
  });

  it("deve restringir alteração de configuração a professores", () => {
    const match = serverCode.match(
      /app\.put\(\s*["']\/api\/typing\/settings\/:studentType["'][\s\S]{0,300}/
    );
    expect(match).not.toBeNull();
    expect(match[0]).toContain("requireProfessor");
  });

  it("deve ter endpoints separados para configurações e ranking do game", () => {
    expect(serverCode).toContain('"/api/typing/game/settings/:studentType"');
    expect(serverCode).toContain('"/api/typing/game/settings/events"');
    expect(serverCode).toContain('"/api/typing/game/score"');
    expect(serverCode).toContain('"/api/typing/game/ranking/global"');
    expect(serverCode).toContain('"/api/typing/game/ranking/turma"');
    expect(serverCode).toContain('"/api/typing/game/ranking/turma/reset"');
    expect(serverCode).toContain("saveTypingGameSettings");
    expect(serverCode).toContain("broadcastTypingGameSettings");
    expect(serverCode).toContain("DELETE FROM typing_game_scores");
    expect(serverCode).toContain("typing_game_ranking");
  });

  it("deve emitir notificações de usuário em tempo real", () => {
    expect(serverCode).toContain('"/api/notifications/events"');
    expect(serverCode).toContain("notificationClients");
    expect(serverCode).toContain("sendUserNotification");
    expect(serverCode).toContain("user-notification");
    expect(serverCode).toContain("notifyChatRecipients");
    expect(pvpServerCode).toContain("sendUserNotification");
    expect(pvpServerCode).toContain("open-typing-pvp");
  });

  it("deve listar para desafio PVP usuários online da mesma turma sem exigir tela PVP aberta", () => {
    expect(serverCode).toContain("onlineUsers");
    expect(serverCode).toContain("getOnlinePvpUsers");
    expect(serverCode).toContain("onlineUsers.set(req.user.id");
    expect(pvpServerCode).toContain("getOnlinePvpUsers(req.user)");
    expect(pvpServerCode).toContain("targetClient");
    expect(pvpServerCode).toContain("sendUserNotification(targetId");
  });

  it("deve excluir professores dos placares PVP e permitir filtro por turma", () => {
    const scoresBlock = pvpServerCode.substring(
      pvpServerCode.indexOf('"/api/typing-pvp/scores"'),
      pvpServerCode.indexOf('"/api/typing-pvp/scores"') + 1200
    );
    expect(scoresBlock).toContain("scope");
    expect(scoresBlock).toContain("turmaId");
    expect(scoresBlock).toContain("w.role = 'aluno' AND l.role = 'aluno'");
    expect(scoresBlock).toContain("m.turma_id = $");
  });

  it("deve finalizar duelos PVP com pontuação persistida e limpeza correta da sala", () => {
    const winBlock = pvpServerCode.substring(
      pvpServerCode.indexOf('"/api/typing-pvp/win"'),
      pvpServerCode.indexOf('"/api/typing-pvp/lose"')
    );
    const loseBlock = pvpServerCode.substring(
      pvpServerCode.indexOf('"/api/typing-pvp/lose"'),
      pvpServerCode.indexOf('"/api/typing-pvp/scores"')
    );

    expect(pvpServerCode).toContain("coercePvpScore");
    expect(winBlock).toContain("const roomId = myClient.roomId");
    expect(winBlock).toContain("pvpClients.delete(roomId)");
    expect(winBlock).toContain("buildPvpMatchScores");
    expect(winBlock).toContain("winnerClient: myClient");
    expect(winBlock).toContain("loserClient");
    expect(winBlock).toContain("res.json({ success: true, match })");
    expect(loseBlock).toContain("const roomId = myClient.roomId");
    expect(loseBlock).toContain("pvpClients.delete(roomId)");
    expect(loseBlock).toContain("buildPvpMatchScores");
    expect(loseBlock).toContain("loserClient: myClient");
    expect(loseBlock).toContain("res.json({ success: true, match })");
  });

  it("deve preservar pontuação PVP sincronizada para evitar placar 0x0", () => {
    expect(pvpServerCode).toContain("mergePvpClientState");
    expect(pvpServerCode).toContain("readPvpClientScore");
    expect(pvpServerCode).toContain("buildPvpMatchScores");
    expect(pvpServerCode).toContain(
      "mergePvpClientState(myClient, req.body.state)"
    );
    expect(pvpServerCode).toContain("winnerClient: myClient");
    expect(pvpServerCode).toContain("loserClient: myClient");
  });
});

describe("Backend - atualização do app", () => {
  it("deve expor versão do app e resetar sessões quando a build muda", () => {
    expect(serverCode).toContain('"/api/app/version"');
    expect(serverCode).toContain("syncAppBuildVersion");
    expect(serverCode).toContain('createHash("sha256")');
    expect(serverCode).toContain("readFile(indexPath)");
    expect(serverCode).toContain("DELETE FROM sessions");
    expect(serverCode).toContain("app_build_version");
  });
});
