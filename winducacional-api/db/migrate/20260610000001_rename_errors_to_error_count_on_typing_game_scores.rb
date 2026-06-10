# A coluna "errors" colide com ActiveRecord::Base#errors (validações),
# tornando o model inutilizável. Renomeia para error_count; a coluna nunca
# foi exposta na API nem usada pelas views de ranking do Node.
class RenameErrorsToErrorCountOnTypingGameScores < ActiveRecord::Migration[7.2]
  def change
    rename_column :typing_game_scores, :errors, :error_count
  end
end
