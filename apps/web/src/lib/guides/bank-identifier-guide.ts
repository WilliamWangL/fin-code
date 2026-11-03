import type { Guide } from "./types";

const guide: Guide = {
  slug: "bank-identifier-guide",
  featured: true,
  reviewed: "2026-11-03",
  en: {
    title: "How bank identifiers work: SWIFT, IBAN and local clearing codes",
    description:
      "A practical map of the codes used to move money across borders and within a country: what each one identifies, which payment rail needs it, and how to check one before sending.",
    intro: [
      "Every cross-border payment needs three separate pieces of information: who holds the account, which account it is, and how the money should be routed inside the destination country. Banks split that work across different codes, and confusing them is the most common reason a transfer bounces back or arrives days late.",
      "This guide explains the four families of codes you will meet on FinCode - SWIFT/BIC, IBAN, and the domestic clearing codes (IFSC, sort code, BSB, ABA routing, CNAPS) - and when each one is the right answer.",
    ],
    sections: [
      {
        id: "three-jobs",
        heading: "Three jobs, three kinds of code",
        paragraphs: [
          "A SWIFT/BIC code identifies an institution, not an account. It tells the correspondent bank which bank in the destination country should receive the message, and nothing more.",
          "An IBAN or a domestic account number identifies the account itself. The IBAN folds the country, the bank and the account into one string with a checksum, which is why an IBAN can be validated before it is sent while a bare account number cannot.",
          "Domestic clearing codes - IFSC in India, sort code in the UK, BSB in Australia, ABA routing in the United States, CNAPS in China - exist because each country runs its own payment system with its own routing table. They are what the local system reads to find the branch.",
        ],
        table: {
          headers: ["Code", "Identifies", "Used by"],
          rows: [
            ["SWIFT/BIC", "An institution (and optionally one office)", "Cross-border wires"],
            ["IBAN", "A specific account", "SEPA and most cross-border transfers"],
            ["IFSC", "A branch in India", "NEFT, RTGS, IMPS"],
            ["Sort code", "A branch in the UK or Ireland", "Faster Payments, BACS, CHAPS"],
            ["BSB", "A branch in Australia", "NPP, direct entry"],
            ["ABA routing", "An institution and Fed district", "Fedwire, ACH"],
            ["CNAPS", "A branch in China", "HVPS, BEPS"],
          ],
        },
      },
      {
        id: "which-to-send",
        heading: "Which code goes in which field",
        paragraphs: [
          "Sending money to Europe usually needs both an IBAN and a BIC, although SEPA transfers inside the euro area only require the IBAN. Sending to the United States needs the ABA routing number plus the account number, and a BIC only if the payment starts outside the country.",
          "Sending to India, the UK, Australia or China needs the domestic code (IFSC, sort code, BSB, CNAPS) together with the account number; the SWIFT/BIC is added when the money comes from abroad.",
        ],
        bullets: [
          "Cross-border wire: beneficiary name, account/IBAN, BIC, and the domestic code when the destination bank asks for it.",
          "SEPA: IBAN only, BIC optional inside the euro area.",
          "Domestic transfer: local clearing code plus account number.",
        ],
      },
      {
        id: "checking",
        heading: "How to check a code before you send",
        paragraphs: [
          "Most codes carry their own validation. An IBAN ends in a MOD-97 checksum, an ABA routing number carries a weighted check digit, an IFSC always has a literal 0 in the fifth position, and a BIC's fifth and sixth characters must be a real ISO country code.",
          "Those checks catch typos, not fraud or closure. A code can be well formed and still belong to a branch that has merged, so confirm the beneficiary details through a channel you already trust before a large payment leaves.",
        ],
      },
      {
        id: "missing-code",
        heading: "When the code is missing",
        paragraphs: [
          "Smaller institutions, fintechs and payment institutions often do not appear in a national clearing directory because they reach the local rail through a sponsor bank. In that case the payment is routed with the sponsor's code and the fintech name in the beneficiary field.",
          "If a bank has no SWIFT code at all, the transfer usually has to go through a correspondent that does, which adds a hops and a fee.",
        ],
      },
    ],
    faq: [
      {
        question: "Is SWIFT the same as IBAN?",
        answer:
          "No. SWIFT (also called BIC) identifies the bank; IBAN identifies the account and contains the bank code inside it. A cross-border transfer to an IBAN country normally needs both.",
      },
      {
        question: "Can I use an IFSC for an international transfer?",
        answer:
          "Only as the domestic routing part. The sending bank still needs the SWIFT/BIC of the Indian bank to reach it from abroad.",
      },
      {
        question: "Why does the same bank have several codes?",
        answer:
          "Institution-level codes such as BIC identify the bank, while branch-level codes such as IFSC, BSB, sort code and CNAPS identify the exact branch, and a large bank can have thousands.",
      },
    ],
  },
  zh: {
    title: "银行识别码是怎么运作的：SWIFT、IBAN 与各国清算码",
    description:
      "一张实用地图：跨境与境内转账分别用哪些编码、每个编码标识什么、哪条支付通道需要它，以及付款前如何核验。",
    intro: [
      "一笔跨境汇款需要三份彼此独立的信息：谁持有账户、是哪一个账户、钱在收款国境内该怎么走。银行把这三种职责拆给不同的编码承担，把它们混淆是转账被退回或延迟到账最常见的原因。",
      "本文讲清你在 FinCode 上会遇到的四类编码——SWIFT/BIC、IBAN，以及各国本地清算码（IFSC、Sort Code、BSB、ABA Routing、CNAPS）——分别该在什么时候使用。",
    ],
    sections: [
      {
        id: "three-jobs",
        heading: "三种职责，三类编码",
        paragraphs: [
          "SWIFT/BIC 标识的是机构，不是账户。它告诉代理行这笔报文应该交给收款国的哪一家银行，仅此而已。",
          "IBAN 或本地账号标识的才是账户本身。IBAN 把国家、银行与账号折叠进一个带校验位的字符串，因此 IBAN 可以在发出前校验，而裸账号不行。",
          "本地清算码——印度的 IFSC、英国的 Sort Code、澳洲的 BSB、美国的 ABA Routing、中国的 CNAPS——存在的原因是每个国家都有自己的支付系统与路由表，它们是本国系统用来定位分行的依据。",
        ],
        table: {
          headers: ["编码", "标识对象", "所属通道"],
          rows: [
            ["SWIFT/BIC", "机构（可细分到具体办公点）", "跨境电汇"],
            ["IBAN", "具体账户", "SEPA 及多数跨境转账"],
            ["IFSC", "印度的分行", "NEFT、RTGS、IMPS"],
            ["Sort Code", "英国或爱尔兰的分行", "Faster Payments、BACS、CHAPS"],
            ["BSB", "澳洲的分行", "NPP、Direct Entry"],
            ["ABA Routing", "机构与联储区", "Fedwire、ACH"],
            ["CNAPS", "中国的分行", "大额支付系统、小额支付系统"],
          ],
        },
      },
      {
        id: "which-to-send",
        heading: "哪个字段填哪个码",
        paragraphs: [
          "汇款到欧洲通常需要 IBAN 加 BIC，但欧元区内的 SEPA 转账只需 IBAN。汇款到美国需要 ABA Routing 加账号，只有从美国境外汇出时才额外需要 BIC。",
          "汇款到印度、英国、澳洲或中国，需要本地清算码（IFSC / Sort Code / BSB / CNAPS）加账号；只有从境外汇入时才补上 SWIFT/BIC。",
        ],
        bullets: [
          "跨境电汇：收款人姓名、账号或 IBAN、BIC，以及收款行要求的本地清算码。",
          "SEPA：只需 IBAN，欧元区内 BIC 可选。",
          "境内转账：本地清算码加账号。",
        ],
      },
      {
        id: "checking",
        heading: "付款前怎么核验",
        paragraphs: [
          "多数编码自带校验：IBAN 末端是 MOD-97 校验位，ABA Routing 带加权校验位，IFSC 第 5 位恒为 0，BIC 的第 5–6 位必须是真实的 ISO 国家代码。",
          "但这些校验只能拦住录入错误，拦不住欺诈与销户。编码可能格式完全正确、却属于一家已经合并的分行，所以大额付款前请通过你原本信任的渠道二次确认收款信息。",
        ],
      },
      {
        id: "missing-code",
        heading: "查不到编码时怎么办",
        paragraphs: [
          "小机构、金融科技公司与支付机构常常不出现在本国清算目录里，因为它们通过一家赞助银行接入本地通道。这种情况下，汇款用赞助行的编码，收款人一栏写金融科技公司的名称。",
          "如果一家银行完全没有 SWIFT 码，汇款通常要经由一家有码的代理行中转，这会多一次跳转和一笔费用。",
        ],
      },
    ],
    faq: [
      {
        question: "SWIFT 和 IBAN 是一回事吗？",
        answer:
          "不是。SWIFT（又称 BIC）标识银行，IBAN 标识账户且内部包含银行代码。向 IBAN 国家跨境汇款通常两者都需要。",
      },
      {
        question: "能用 IFSC 做国际汇款吗？",
        answer:
          "它只承担境内路由那一段。汇出行仍然需要印度银行的 SWIFT/BIC 才能从境外触达。",
      },
      {
        question: "同一家银行为什么有多个编码？",
        answer:
          "BIC 这类机构级编码标识银行本身；IFSC、BSB、Sort Code、CNAPS 这类分行级编码标识具体网点，一家大银行可能有成千上万个。",
      },
    ],
  },
};

export default guide;
