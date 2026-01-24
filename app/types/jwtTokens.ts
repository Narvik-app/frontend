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

export type JwtAccessToken = _Token

export type JwtRefreshToken = _Token
