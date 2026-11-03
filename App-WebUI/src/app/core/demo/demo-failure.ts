/** A refusal of the demo backend: the HTTP status, the message code and its {0}, {1} arguments, like BusinessException of the API. */
export class DemoFailure {
  constructor(readonly status: number, readonly code: string, readonly args: (string | number)[] = []) {}
}
