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
  date: Date
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface JwtAccessToken extends _Token {

}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface JwtRefreshToken extends _Token {

}
