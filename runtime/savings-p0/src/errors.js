export class WorkflowError extends Error {
  constructor(message, { code = "WORKFLOW_ERROR", retryable = false, customerSafeMessage = "Automation could not complete the operation." } = {}) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.retryable = retryable;
    this.customerSafeMessage = customerSafeMessage;
  }
}

export class RetryableError extends WorkflowError {
  constructor(message, options = {}) {
    super(message, { ...options, retryable: true });
  }
}

export class PermanentError extends WorkflowError {
  constructor(message, options = {}) {
    super(message, { ...options, retryable: false });
  }
}
