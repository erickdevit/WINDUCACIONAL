// Espelha User#as_public_json (winducacional-api/app/models/user.rb)
export type UserRole = "professor" | "secretaria" | "aluno"
export type StudentType = "kids" | "normal"

export interface User {
  id: string
  username: string
  displayName: string
  role: UserRole
  studentType: StudentType
  turmaId: string | null
  active: boolean
  createdAt: string
  updatedAt: string
}
