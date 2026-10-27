export type AuthUser = {
  id: string;
  login: string;
  role: string;
};

export type AuthResponse = {
  user: AuthUser;
};

export type AuthState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'unauthenticated' }
  | { status: 'authenticated'; user: AuthUser }
  | { status: 'error' };

export type LoginCredentials = {
  login: string;
  password: string;
};
