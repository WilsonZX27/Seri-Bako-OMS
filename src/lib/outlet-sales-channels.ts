export const salesChannelLabels = {
  "visa": "Visa",
  "master": "Master",
  "debit": "Debit",
  "union_pay": "Union Pay",
  "alipay": "Alipay",
  "jcb": "JCB",
  "feedme_card": "FEEDME_CARD",
  "duitnow": "DuitNow",
  "bank_transfer": "Bank Transfer",
  "feedme_wallet": "FEEDME_WALLET",
  "grabfood": "Grab Food",
  "foodpanda": "Food Panda",
  "shopee_food": "Shopee Food",
  "voucher": "Voucher",
  "credit_card": "Credit Card (legacy)"
} as const;
export const salesChannels = ["visa", "master", "debit", "union_pay", "alipay", "jcb", "feedme_card", "duitnow", "bank_transfer", "feedme_wallet", "grabfood", "foodpanda", "shopee_food", "voucher", "credit_card"] as const;
export type SalesChannel = typeof salesChannels[number];
export const cardChannels: SalesChannel[] = ["visa", "master", "debit", "union_pay", "alipay", "jcb", "feedme_card"];
export const otherChannels: SalesChannel[] = ["duitnow", "bank_transfer", "feedme_wallet", "grabfood", "foodpanda", "shopee_food", "voucher"];
