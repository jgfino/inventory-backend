import ErrorResponse from "../ErrorResponse";

const DatabaseErrors = {
  INVALID_FIELD: (detail?: string) =>
    new ErrorResponse(
      "invalid-field",
      400,
      "One or more required fields invalid or missing",
      detail
    ),
  DUPLICATE_FIELD: (detail?: string) =>
    new ErrorResponse(
      "duplicate-field",
      400,
      "One or more fields contain duplicate values",
      detail
    ),
  VALIDATION: (detail?: string) =>
    new ErrorResponse(
      "validation-error",
      400,
      "Unable to validate one or more fields",
      detail
    ),
  NOT_FOUND: (detail?: string) =>
    new ErrorResponse("not-found", 404, "Record not found", detail),
};

export default DatabaseErrors;
