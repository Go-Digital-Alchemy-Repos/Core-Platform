import type { ErrorRequestHandler } from "express";
import { MappedFormSubmissionError } from "../services/forms.service";
/** Optional mapped-field diagnostics; legacy errors continue to the ordinary handler. */
export const mappedFormErrorHandler: ErrorRequestHandler = (error, _req, res, next) => {
  if (!(error instanceof MappedFormSubmissionError)) {
    next(error);
    return;
  }
  res.status(400).json({ message: error.message, errors: error.errors });
};
