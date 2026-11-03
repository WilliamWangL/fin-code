import type { Guide } from "./types";

const guide: Guide = {
  slug: "cnaps-code",
  family: "CNAPS",
  reviewed: "2026-11-03",
  en: {
    title: "CNAPS codes: reading a Chinese bank branch number",
    description:
      "Twelve digits that encode the bank category, the clearing region and the branch. What CNAPS is used for, how it differs from a SWIFT code, and why the same bank has hundreds of them.",
    intro: [
      "CNAPS is the clearing system operated by the People's Bank of China, and the twelve-digit number attached to each participating branch is what domestic payments are routed with. It is often called a bank number or a 联行号 in Chinese business documents.",
    ],
    sections: [
      {
        id: "structure",
        heading: "Twelve digits, four blocks",
        paragraphs: [
          "The first three digits are the bank category code, which separates policy banks, state-owned commercial banks, joint-stock banks, city commercial banks, rural credit cooperatives and foreign banks.",
          "The next four digits are the city or region code of the clearing area, the following four identify the branch, and the last digit is a check digit.",
        ],
        table: {
          headers: ["Part", "Digits", "Meaning"],
          rows: [
            ["Bank category", "1-3", "Policy, state-owned, joint-stock, rural, foreign"],
            ["Region", "4-7", "Clearing area, usually the city"],
            ["Branch", "8-11", "Individual branch"],
            ["Check digit", "12", "Checksum over the preceding digits"],
          ],
        },
      },
      {
        id: "usage",
        heading: "Where it is used",
        paragraphs: [
          "The high-value payment system settles large interbank transfers in real time; the bulk payment system handles smaller retail transfers. Both route by CNAPS code, which is why a wrong code sends the money to a branch that cannot find the account.",
          "Cross-border payments into China need the CNAPS code in addition to the SWIFT/BIC of the receiving bank, because the foreign leg only reaches the bank and the domestic leg still has to find the branch.",
        ],
      },
      {
        id: "not-swift",
        heading: "It is not a SWIFT code",
        paragraphs: [
          "A Chinese bank typically publishes one SWIFT/BIC for the head office and one per major branch, but it holds CNAPS codes for every participating branch - thousands for a large bank. If you have a SWIFT code, you can identify the bank; you still need the CNAPS code to name the branch.",
          "Unlike an IBAN, a CNAPS code contains no account information. The account number is separate.",
        ],
      },
      {
        id: "reading",
        heading: "How to check one",
        paragraphs: [
          "Check the length first: twelve digits, no spaces. Then check the bank category against the bank you intend to pay, since a valid code with the wrong category prefix belongs to an entirely different institution.",
          "Branch codes change when a branch is restructured or a rural cooperative is folded into a commercial bank, and those reorganisations are frequent. Always take the code from the receiving party or a recent official source.",
        ],
      },
    ],
    faq: [
      {
        question: "Is a CNAPS code the same as a SWIFT code?",
        answer:
          "No. SWIFT/BIC identifies the institution for cross-border messages; CNAPS identifies the branch for domestic clearing inside China. An international transfer to China normally needs both.",
      },
      {
        question: "Can one bank have several CNAPS codes?",
        answer:
          "Yes. Each participating branch has its own, so a large bank holds thousands of them.",
      },
    ],
  },
  zh: {
    title: "CNAPS 行号：怎么看懂中国的银行联行号",
    description:
      "12 位数字，编码了银行类别、清算区域与分行。讲清 CNAPS 用在哪、与 SWIFT 的区别，以及同一家银行为什么会有几百个行号。",
    intro: [
      "CNAPS 是中国人民银行运行的清算系统，每个参与网点对应的 12 位数字就是境内支付的路由依据。在中文单据里，它常被称作联行号或银行行号。",
    ],
    sections: [
      {
        id: "structure",
        heading: "12 位，四段",
        paragraphs: [
          "前 3 位是银行类别代码，用于区分政策性银行、国有商业银行、股份制银行、城市商业银行、农村信用社与外资银行。",
          "第 4–7 位是清算区域的城市或地区代码，第 8–11 位标识具体分行，最后 1 位是校验位。",
        ],
        table: {
          headers: ["部分", "位数", "含义"],
          rows: [
            ["银行类别", "1-3", "政策性、国有、股份制、农信、外资"],
            ["地区", "4-7", "清算区域，通常为城市"],
            ["分行", "8-11", "具体分行"],
            ["校验位", "12", "对前若干位的校验"],
          ],
        },
      },
      {
        id: "usage",
        heading: "用在哪里",
        paragraphs: [
          "大额支付系统实时处理跨行大额转账，小额支付系统处理零售小额转账。两者都按 CNAPS 行号路由，因此行号填错，钱会进到一家找不到该账户的分行。",
          "向中国跨境汇款除了收款行的 SWIFT/BIC，还需要 CNAPS 行号：境外汇路只能到银行，境内段仍要靠行号找到具体分行。",
        ],
      },
      {
        id: "not-swift",
        heading: "它不是 SWIFT 码",
        paragraphs: [
          "中国的银行通常只有总行与少数大分行各有一个 SWIFT/BIC，但参与清算的每个网点都有自己的 CNAPS 行号——大行可达数千个。有 SWIFT 码只能定位到银行，要指明分行仍需要 CNAPS 行号。",
          "与 IBAN 不同，CNAPS 行号不含账号信息，账号是单独提供的。",
        ],
      },
      {
        id: "reading",
        heading: "如何核对",
        paragraphs: [
          "先看长度：必须 12 位、无空格。再核对银行类别与你打算付款的银行是否一致——格式合法但类别前缀不匹配时，它属于完全不同的一家机构。",
          "分行重组、农信社并入商业银行时常会带来行号变更，这类调整相当频繁。请始终以收款方或近期的官方来源为准。",
        ],
      },
    ],
    faq: [
      {
        question: "CNAPS 行号和 SWIFT 码是一回事吗？",
        answer:
          "不是。SWIFT/BIC 标识机构，用于跨境报文；CNAPS 行号标识分行，用于中国境内清算。向中国跨境汇款通常两者都需要。",
      },
      {
        question: "一家银行会有多个 CNAPS 行号吗？",
        answer:
          "会。每个参与清算的网点各有自己的行号，大行可达数千个。",
      },
    ],
  },
};

export default guide;
