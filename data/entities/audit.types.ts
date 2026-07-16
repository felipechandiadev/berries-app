export enum AuditActionType {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  UPDATE_PASSWORD = 'UPDATE_PASSWORD',
  LOGIN_SUCCESS = 'LOGIN_SUCCESS',
  LOGIN_FAILED = 'LOGIN_FAILED',
  LOGOUT = 'LOGOUT',
}

export interface AuditChangeData {
  fields: {
    [fieldName: string]: {
      oldValue: any;
      newValue: any;
    };
  };
  summary: string;
  changeCount: number;
}
