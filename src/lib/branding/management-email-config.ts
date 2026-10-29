type Environment = Record<string, string | undefined>;
const email = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;
/** Configuration belongs to one independently deployed company; there is no shared recipient fallback. */
export function managementEmailConfig(env: Environment) {
  const companyId=env.MANAGEMENT_EMAIL_COMPANY_ID?.trim();
  const sender=env.MANAGEMENT_EMAIL_FROM?.trim();
  const pilotRecipient=env.MANAGEMENT_EMAIL_PILOT_RECIPIENT?.trim().toLowerCase();
  const site=env.MANAGEMENT_EMAIL_BASE_URL?.trim();
  const brand=env.MANAGEMENT_EMAIL_BRAND?.trim()||"Operations";
  if(!companyId||!/^\b[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}\b$/i.test(companyId)||!sender||sender.length>160||/[\r\n]/.test(sender)||!pilotRecipient||!email.test(pilotRecipient)||brand.length>80||/[\r\n]/.test(brand)||!site)return null;
  const senderAddress=sender.match(/<([^<>]+)>$/)?.[1]??sender;
  if(!email.test(senderAddress))return null;
  try { const url=new URL(site);if(url.protocol!=="https:"||url.username||url.password||url.search||url.hash||url.pathname!=="/")return null;return {companyId,sender,pilotRecipient,baseUrl:url.origin,brand}; } catch { return null; }
}
