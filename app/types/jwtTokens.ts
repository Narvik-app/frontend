export class JwtToken {
  constructor(isBadger: boolean) {
    this.isBadger = isBadger;
  }

  public isBadger: boolean
  public access?: JwtAccessToken;
  public refresh?: JwtRefreshToken;
}

interface _Token {
  token: string,
  date: Date | null
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface JwtAccessToken extends _Token {

}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface JwtRefreshToken extends _Token {

}

/** Shape of JwtToken as deserialized from localStorage (dates are ISO strings, not Date objects). */
export interface RawJwtToken {
  isBadger?: boolean
  access?: { token: string; date: string | null }
  refresh?: { token: string; date: string | null }
}
