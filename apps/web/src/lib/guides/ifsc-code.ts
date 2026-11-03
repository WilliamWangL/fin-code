import type { Guide } from "./types";

const guide: Guide = {
  slug: "ifsc-code",
  family: "IFSC",
  reviewed: "2026-11-03",
  related: ["bank-identifier-guide", "cnaps-code", "swift-bic-code"],
  en: {
    title: "IFSC codes explained: structure, MICR and how to verify one",
    description:
      "Eleven characters, a literal zero in the middle, and the only code NEFT, RTGS and IMPS accept. How an IFSC is built and what to check before a transfer to India.",
    intro: [
      "Every bank branch in India that participates in the retail payment systems carries an Indian Financial System Code. It is assigned by the Reserve Bank of India and printed on chequebooks and passbooks, usually next to the MICR line.",
    ],
    sections: [
      {
        id: "structure",
        heading: "Eleven characters, three parts",
        paragraphs: [
          "The first four characters are the bank code, assigned once per bank and shared by all of its branches. The fifth character is always the digit 0 - it was reserved for future use and never varied, which makes IFSCs easy to recognise at a glance.",
          "The last six characters identify the branch inside that bank. They are alphanumeric, so ICIC0000001 and HDFC0000001 are both valid and belong to different banks' head offices.",
        ],
        table: {
          headers: ["Part", "Length", "Meaning"],
          rows: [
            ["Bank code", "4 letters", "Assigned by the RBI, one per bank"],
            ["Reserved", "1 digit", "Always 0"],
            ["Branch code", "6 characters", "Identifies the branch, alphanumeric"],
          ],
        },
      },
      {
        id: "usage",
        heading: "Which rails accept it",
        paragraphs: [
          "NEFT settles in hourly batches and accepts an IFSC for any participating branch. RTGS is for high-value transfers and settles in real time during banking hours. IMPS runs around the clock and is the rail most apps use for instant transfers.",
          "UPI works differently: it addresses a person through a virtual payment address, and the IFSC is only needed when you link a bank account for the first time.",
        ],
      },
      {
        id: "micr",
        heading: "IFSC and MICR are not the same",
        paragraphs: [
          "MICR is the nine-digit code printed at the bottom of a cheque, used by the cheque clearing system. It encodes the city, the bank and the branch, and it is a different number from the IFSC even though both identify a branch.",
          "A branch record can carry both. When a form asks for MICR, an IFSC will not work, and vice versa.",
        ],
      },
      {
        id: "verify",
        heading: "How to verify before sending",
        paragraphs: [
          "Check the shape first: four letters, a zero, six alphanumeric characters, no spaces or hyphens. Then check that the bank code matches the bank you intend to pay - a mistyped branch code with a valid bank code will often still settle, into the wrong branch.",
          "Branch codes change when branches merge or are re-coded, so confirm against the source your bank publishes rather than a code saved years ago.",
        ],
      },
    ],
    faq: [
      {
        question: "Can an IFSC be used for an international transfer?",
        answer:
          "It routes the payment inside India. A transfer from abroad still needs the SWIFT/BIC of the receiving bank.",
      },
      {
        question: "Is the IFSC the same as an account number?",
        answer:
          "No. The IFSC identifies the branch, the account number identifies the account. Indian transfers need both.",
      },
    ],
  },
  zh: {
    title: "IFSC 编码详解：结构、MICR 关系与核验方法",
    description:
      "11 位字符、第 5 位恒为 0，是 NEFT、RTGS、IMPS 唯一接受的编码。讲清 IFSC 的构成，以及向印度汇款前该核对什么。",
    intro: [
      "印度每一家加入零售支付系统的银行网点都有印度金融系统代码（IFSC）。它由印度储备银行（RBI）分配，印在存折与支票簿上，通常紧邻 MICR 行。",
    ],
    sections: [
      {
        id: "structure",
        heading: "11 位，三段",
        paragraphs: [
          "前 4 位是银行代码，每家银行分配一次，其所有分行共用。第 5 位恒为数字 0——这一位当时预留给未来使用，后来从未变化，因此 IFSC 一眼即可辨认。",
          "后 6 位在该银行内部标识分行。它们可以是字母与数字，所以 ICIC0000001 与 HDFC0000001 都合法，分别属于两家银行的总行。",
        ],
        table: {
          headers: ["部分", "长度", "含义"],
          rows: [
            ["银行代码", "4 位字母", "由 RBI 分配，每家银行一个"],
            ["保留位", "1 位数字", "恒为 0"],
            ["分行代码", "6 位字符", "标识分行，可含字母与数字"],
          ],
        },
      },
      {
        id: "usage",
        heading: "哪些通道接受它",
        paragraphs: [
          "NEFT 按小时批量清算，任何参与网点只要有 IFSC 即可收款。RTGS 面向大额，在营业时间内实时清算。IMPS 全天候运行，是多数 App 做即时转账的通道。",
          "UPI 的逻辑不同：它通过虚拟支付地址定位到人，只有在首次绑定银行账户时才需要 IFSC。",
        ],
      },
      {
        id: "micr",
        heading: "IFSC 与 MICR 不是一回事",
        paragraphs: [
          "MICR 是印在支票底部的 9 位数字，供票据清算系统使用，编码了城市、银行与分行。虽然两者都指向同一家分行，但它们是不同的号码。",
          "一个分行记录可能同时带这两者。表单要 MICR 时，填 IFSC 无效，反之亦然。",
        ],
      },
      {
        id: "verify",
        heading: "付款前如何核验",
        paragraphs: [
          "先看形状：4 位字母、一个 0、6 位字母数字，不含空格或连字符。再确认银行代码与你打算付款的银行一致——银行代码正确但分行代码打错时，钱往往仍能入账，只是进了错误的分行。",
          "分行代码会因合并或重编码而变化，请以银行公布的来源为准，而不是多年以前存下的编码。",
        ],
      },
    ],
    faq: [
      {
        question: "IFSC 能用于国际汇款吗？",
        answer:
          "它只负责印度境内的路由。从境外汇入仍需收款行的 SWIFT/BIC。",
      },
      {
        question: "IFSC 就是账号吗？",
        answer:
          "不是。IFSC 标识分行，账号标识账户。印度境内转账两者都需要。",
      },
    ],
  },
};

export default guide;
