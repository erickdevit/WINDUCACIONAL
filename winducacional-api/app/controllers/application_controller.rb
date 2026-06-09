class ApplicationController < ActionController::API
  include ActionController::Cookies

  rescue_from ApiError do |error|
    render json: { error: error.message }, status: error.status
  end

  rescue_from ActiveRecord::RecordNotFound do
    render json: { error: "Registro não encontrado." }, status: :not_found
  end

  rescue_from ActiveRecord::RecordInvalid do |error|
    render json: { error: error.record.errors.full_messages.first }, status: :bad_request
  end
end
