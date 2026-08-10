/**
 * `visitorId` is an opaque, server-generated random token — never anything
 * derived from IP, user-agent, or any other request fact (Self-Exclusion +
 * Privacy requirements iteration §7/§10: "exclude my designated
 * browser/device," never "identify a person"). `isOwner` is likewise a fact
 * about *this request* (the owner cookie was present, or the server is
 * running outside production), not a claim about who's behind it.
 */
export interface VisitRequest {
  visitorId: string;
  isOwner: boolean;
}
