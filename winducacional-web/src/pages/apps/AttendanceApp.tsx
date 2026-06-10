import { useGetMeQuery } from "@/features/auth/authApi"
import { useGetMyAttendanceQuery } from "@/features/attendance/attendanceApi"
import { formatDateBR, formatTimeBR } from "@/features/attendance/attendanceFormat"
import { getApiErrorMessage } from "@/utils/errors"

export default function AttendanceApp() {
  const { data: me } = useGetMeQuery()
  const isStudent = me?.user.role === "aluno"
  const { data, isLoading, isError, error } = useGetMyAttendanceQuery(undefined, { skip: !isStudent })

  if (!isStudent) {
    return <p className="text-sm text-white/60">A frequência está disponível apenas para alunos.</p>
  }

  if (isLoading) return <p className="text-sm text-white/60">Carregando…</p>
  if (isError || !data) {
    return <p className="text-sm text-red-400">{getApiErrorMessage(error, "Não foi possível carregar a frequência.")}</p>
  }

  return (
    <div className="flex h-full flex-col gap-3 text-sm">
      <div className="flex items-center justify-between rounded-md bg-black/30 px-3 py-2">
        <span className="text-white/70">Hoje, {formatDateBR(data.today)}</span>
        {data.todayRecord ? (
          <span className="rounded-full bg-green-600/30 px-2 py-0.5 text-xs font-medium text-green-400">
            Presença registrada
          </span>
        ) : (
          <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs font-medium text-white/60">Sem registro hoje</span>
        )}
      </div>

      <div className="flex-1 overflow-auto">
        {data.records.length === 0 ? (
          <p className="text-xs text-white/40">Nenhum registro de frequência ainda.</p>
        ) : (
          <table className="w-full text-left text-xs">
            <thead className="text-white/50">
              <tr>
                <th className="py-1 pr-2 font-medium">Data</th>
                <th className="py-1 pr-2 font-medium">1º acesso</th>
                <th className="py-1 pr-2 font-medium">Último acesso</th>
                <th className="py-1 font-medium">Acessos</th>
              </tr>
            </thead>
            <tbody>
              {data.records.map((record) => (
                <tr key={record.id} className="border-t border-white/5">
                  <td className="py-1 pr-2">{formatDateBR(record.attendanceDate)}</td>
                  <td className="py-1 pr-2">{formatTimeBR(record.firstLoginAt)}</td>
                  <td className="py-1 pr-2">{formatTimeBR(record.lastLoginAt)}</td>
                  <td className="py-1">{record.loginCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
