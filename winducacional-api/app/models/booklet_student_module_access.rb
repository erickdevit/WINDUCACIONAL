class BookletStudentModuleAccess < ApplicationRecord
  self.table_name = "booklet_student_module_access"
  self.primary_key = [:module_id, :user_id]

  belongs_to :user
end
