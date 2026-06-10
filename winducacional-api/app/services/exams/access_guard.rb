module Exams
  # Equivalente ao ensureExamAccess do servidor Node: valida a existência da
  # prova e o acesso do aluno (publicação, turma e atribuição).
  class AccessGuard
    def self.call(user:, exam_id:, for_submit: false)
      exam = Exam.find_by(id: exam_id)
      raise ApiError.new("Prova não encontrada.", 404) unless exam

      return exam if user.role != "aluno"

      raise ApiError.new("Prova indisponível.", 403) unless exam.active? && exam.is_published?

      if exam.turma_id.present? && exam.turma_id != user.turma_id
        raise ApiError.new("Acesso negado a esta prova.", 403)
      end

      if for_submit && !ExamAssignment.exists?(exam_id: exam_id, user_id: user.id)
        raise ApiError.new("Esta prova não foi atribuída ao aluno.", 403)
      end

      exam
    end
  end
end
