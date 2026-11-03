import type { Guide } from "./types";

const guide: Guide = {
  slug: "sort-code",
  family: "SORT_CODE",
  reviewed: "2026-11-03",
  en: {
    title: "UK sort codes: format, account pairing and the rails behind them",
    description:
      "Six digits written as three pairs, one per bank branch. How sort codes work with account numbers, why Ireland shares the format, and what to do when a provider has no code of its own.",
    intro: [
      "A sort code identifies a bank branch in the United Kingdom and Ireland. It is always six digits, almost always shown as three pairs - 11-22-33 - and it only makes sense together with an eight-digit account number.",
    ],
    sections: [
      {
        id: "structure",
        heading: "Reading the six digits",
        paragraphs: [
          "The first two digits identify the bank or building society, the middle two the clearing location within that bank, and the last two the individual branch. None of the three is a checksum, so a valid-looking pair can still be wrong.",
          "Banks print it with hyphens on statements and chequebooks but store it as six digits, and forms should accept either form.",
        ],
        table: {
          headers: ["Part", "Digits", "Meaning"],
          rows: [
            ["Bank", "1-2", "Bank or building society"],
            ["Location", "3-4", "Clearing location inside that bank"],
            ["Branch", "5-6", "Individual branch"],
          ],
        },
      },
      {
        id: "account-number",
        heading: "It only works with the account number",
        paragraphs: [
          "Domestic transfers in the UK need the sort code and the account number together. The account number carries no checksum of its own, so mistakes surface at the receiving bank rather than at the form.",
          "Some payment providers ask for the account number before the sort code; the order does not change the meaning, only the field order.",
        ],
      },
      {
        id: "rails",
        heading: "Which rail the payment takes",
        paragraphs: [
          "Faster Payments handles ordinary transfers and settles within seconds. BACS runs payroll and direct debits on a three-day cycle. CHAPS is the same-day high-value rail and carries a fee.",
          "The sort code is the same for all three; what differs is the scheme the sending bank submits the payment to.",
        ],
      },
      {
        id: "ireland",
        heading: "Ireland and the six-digit edge cases",
        paragraphs: [
          "Irish banks historically used the same six-digit format, which is why one directory covers both countries. Irish codes often begin with 9 and are routed through the Irish clearing system rather than the UK one.",
          "Fintechs and e-money institutions frequently have no sort code at all and reach Faster Payments through a sponsor bank. In that case the sponsor's code is used and the fintech name appears as the beneficiary.",
        ],
      },
    ],
    faq: [
      {
        question: "Can I receive money from abroad with a sort code?",
        answer:
          "Not on its own. An international transfer also needs the receiving bank's SWIFT/BIC and usually an IBAN.",
      },
      {
        question: "Why is my sort code not in the directory?",
        answer:
          "Either the institution is not a direct participant in the UK schemes and routes through a sponsor bank, or the branch was closed and the code withdrawn.",
      },
    ],
  },
  zh: {
    title: "英国 Sort Code：格式、与账号的配对以及背后的清算网络",
    description:
      "6 位数字写成三组、对应一家分行。讲清 Sort Code 如何与账号配合、爱尔兰为何共用同一格式，以及服务商没有自己的编码时该怎么办。",
    intro: [
      "Sort Code 标识英国与爱尔兰的一家银行网点。它恒为 6 位数字，几乎总是写成三组——11-22-33——并且只有与 8 位账号一起出现才有意义。",
    ],
    sections: [
      {
        id: "structure",
        heading: "这 6 位怎么读",
        paragraphs: [
          "前 2 位标识银行或建房互助协会，中间 2 位是该银行内部的清算地点，最后 2 位是具体分行。三段都不含校验位，所以看起来合法的组合也可能写错。",
          "银行在流水与支票簿上带连字符打印，但存储时为 6 位连续数字，表单应当两种写法都能接受。",
        ],
        table: {
          headers: ["部分", "位数", "含义"],
          rows: [
            ["银行", "1-2", "银行或建房互助协会"],
            ["地点", "3-4", "该银行内部的清算地点"],
            ["分行", "5-6", "具体分行"],
          ],
        },
      },
      {
        id: "account-number",
        heading: "必须与账号一起使用",
        paragraphs: [
          "英国境内转账需要 Sort Code 与账号同时提供。账号本身不含校验位，因此录入错误往往在收款行才暴露，而不是在表单环节。",
          "部分支付服务商先问账号再问 Sort Code；顺序不改变含义，只是字段排列不同。",
        ],
      },
      {
        id: "rails",
        heading: "走哪条清算通道",
        paragraphs: [
          "Faster Payments 处理普通转账，秒级到账。BACS 承载代发工资与直接借记，三天周期。CHAPS 是当日大额通道，会收取费用。",
          "三者使用的是同一个 Sort Code，区别在于汇出行把付款提交给哪套清算机制。",
        ],
      },
      {
        id: "ireland",
        heading: "爱尔兰与几种边界情况",
        paragraphs: [
          "爱尔兰的银行历史上沿用同样的 6 位格式，因此一份目录可以覆盖两国。爱尔兰编码常以 9 开头，通过爱尔兰清算系统而非英国系统处理。",
          "金融科技公司与电子货币机构往往根本没有 Sort Code，而是通过一家赞助银行接入 Faster Payments。这时使用赞助行的编码，收款人一栏写金融科技公司的名称。",
        ],
      },
    ],
    faq: [
      {
        question: "能用 Sort Code 接收境外汇款吗？",
        answer:
          "单靠它不行。跨境汇款还需要收款行的 SWIFT/BIC，通常还需要 IBAN。",
      },
      {
        question: "为什么目录里查不到我的 Sort Code？",
        answer:
          "要么该机构不是英国清算体系的直接参与者、通过赞助银行接入；要么该分行已关闭、编码被收回。",
      },
    ],
  },
};

export default guide;
