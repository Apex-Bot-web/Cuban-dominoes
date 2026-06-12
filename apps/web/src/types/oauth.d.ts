// Google Identity Services
interface GoogleAccountsId {
  initialize(config: {
    client_id: string;
    callback: (response: { credential: string }) => void;
    auto_select?: boolean;
  }): void;
  renderButton(
    element: HTMLElement,
    options: {
      theme?: 'outline' | 'filled_blue' | 'filled_black';
      size?: 'large' | 'medium' | 'small';
      shape?: 'rectangular' | 'pill' | 'circle' | 'square';
      text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
      width?: number;
    },
  ): void;
  prompt(): void;
  cancel(): void;
}
interface Window {
  google?: { accounts: { id: GoogleAccountsId } };
}

// Apple Sign In
interface AppleSignInAuth {
  init(config: {
    clientId: string;
    scope?: string;
    redirectURI: string;
    usePopup?: boolean;
  }): void;
  signIn(): Promise<{
    authorization: { id_token: string; code: string };
    user?: {
      name?: { firstName?: string; lastName?: string };
      email?: string;
    };
  }>;
}
interface Window {
  AppleID?: { auth: AppleSignInAuth };
}
