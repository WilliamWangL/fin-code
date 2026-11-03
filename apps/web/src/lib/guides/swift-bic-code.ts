import type { Guide } from "./types";

const guide: Guide = {
  slug: "swift-bic-code",
  family: "SWIFT",
  reviewed: "2026-11-03",
  related: ["bank-identifier-guide", "ifsc-code", "cnaps-code"],
  en: {
    title: "How to read a SWIFT/BIC code",
    description:
      "Eight or eleven characters, four of which name the bank and two of which name the country. What each block means, how to find the code for a bank, and when an 8-character BIC is enough.",
    intro: [
      "A SWIFT code and a BIC are the same thing: a routing address for a bank message, standardised as ISO 9362. If a payment form asks for one and you only know the bank's name, the code is easy to reconstruct once you know the layout.",
    ],
    sections: [
      {
        id: "structure",
        heading: "The four blocks",
        paragraphs: [
          "Positions 1-4 are the institution code, usually a recognisable abbreviation. Positions 5-6 are the ISO country code of the office that holds the code, so a BIC beginning with DEHT belongs to a German entity and the next two characters must be a real country.",
          "Positions 7-8 describe the office within that country. Positions 9-11 are optional and, when present, point at one branch; XXX is the convention for the head office.",
        ],
        table: {
          headers: ["Block", "Length", "Meaning"],
          rows: [
            ["Institution", "4 letters", "Bank, usually an abbreviation of the name"],
            ["Country", "2 letters", "ISO 3166-1 alpha-2 of the issuing office"],
            ["Location", "2 characters", "Office or city code within the country"],
            ["Branch", "3 characters, optional", "One branch; XXX means head office"],
          ],
        },
      },
      {
        id: "eight-or-eleven",
        heading: "Eight characters or eleven",
        paragraphs: [
          "An 8-character BIC is complete: it identifies the institution and the office, and the payment can be routed with it. The three extra characters only matter when the bank publishes separate codes per branch or per business line.",
          "Do not pad an 8-character code with XXX yourself and expect it to be official. It is accepted by most systems because it resolves to the head office, but the canonical record is the 8-character value.",
        ],
      },
      {
        id: "finding-it",
        heading: "Finding the code for a bank",
        paragraphs: [
          "On an invoice or a bank statement it usually sits next to the IBAN. If you only have a bank name, search the name in the bank directory; the institution page lists every code FinCode holds for that bank, and each code page shows which city it belongs to.",
          "Watch for several codes under the same name. A banking group typically has one code per legal entity per country, so the right code depends on which entity actually holds the account.",
        ],
      },
      {
        id: "mistakes",
        heading: "Mistakes that get a payment returned",
        paragraphs: [
          "The most common failures are a letter O typed for a zero, a BIC copied from a parent company's website instead of the local subsidiary, and a branch BIC used where the bank expects the head-office one.",
          "A BIC never contains a hyphen or a space. If a source shows one, it is formatting, not part of the value.",
        ],
      },
    ],
    faq: [
      {
        question: "Can a BIC contain a 0 or a 1?",
        answer:
          "Yes, in positions 7 to 11. The first six characters are always letters, which is the quickest way to spot a typo.",
      },
      {
        question: "Is a BIC required for a SEPA payment?",
        answer:
          "Inside the euro area SEPA transfers are routed by IBAN alone, so a BIC is optional. Outside it, a BIC is normally required.",
      },
    ],
  },
  zh: {
    title: "怎么看懂 SWIFT/BIC 编码",
    description:
      "8 位或 11 位字符：前 4 位是银行、第 5–6 位是国家。逐段说明每一块的含义、如何查到某家银行的编码，以及 8 位何时已经够用。",
    intro: [
      "SWIFT 码与 BIC 是同一个东西：标准为 ISO 9362 的银行报文路由地址。付款表单要求填写而你只知道银行名称时，只要了解它的排布规则，编码很容易拼出来。",
    ],
    sections: [
      {
        id: "structure",
        heading: "四个区块",
        paragraphs: [
          "第 1–4 位是机构代码，通常是能辨认的银行名称缩写。第 5–6 位是持有该编码的机构所在地的 ISO 国家代码，因此以 DEHT 开头的 BIC 属于德国实体，而第 5–6 位必须是真实存在的国家代码。",
          "第 7–8 位描述该国境内的办公点。第 9–11 位可选，存在时指向某个具体分行；XXX 是总行的约定写法。",
        ],
        table: {
          headers: ["区块", "长度", "含义"],
          rows: [
            ["机构代码", "4 位字母", "银行，通常是名称缩写"],
            ["国家代码", "2 位字母", "发码机构所在地的 ISO 3166-1 二位码"],
            ["位置代码", "2 位字符", "该国境内的办公点或城市代码"],
            ["分行代码", "3 位字符，可选", "指向具体分行；XXX 表示总行"],
          ],
        },
      },
      {
        id: "eight-or-eleven",
        heading: "8 位还是 11 位",
        paragraphs: [
          "8 位的 BIC 是完整的：它已经标识了机构与办公点，可以据此完成路由。多出来的 3 位只在银行按分行或业务条线分别公布编码时才有意义。",
          "不要把 8 位编码自行补上 XXX 当作官方值。多数系统接受它，因为它会解析到总行，但规范记录就是那 8 位。",
        ],
      },
      {
        id: "finding-it",
        heading: "怎么查到某家银行的编码",
        paragraphs: [
          "在发票或银行流水上，它通常紧邻 IBAN。如果只有银行名称，可以在银行目录中搜索；机构页会列出 FinCode 收录的该行全部编码，每个编码的详情页则会显示它属于哪个城市。",
          "注意同一名称下的多个编码。银行集团通常每个国家的每个法人实体各有一个编码，用哪一个取决于账户实际开在哪家实体。",
        ],
      },
      {
        id: "mistakes",
        heading: "会导致退汇的常见错误",
        paragraphs: [
          "最常见的三种：把字母 O 打成数字 0；从母公司网站复制了 BIC 而不是本地子公司的；以及在银行要求填总行码时填了分行码。",
          "BIC 中永远不含连字符或空格。如果数据源里出现了，那只是展示格式，不属于编码本身。",
        ],
      },
    ],
    faq: [
      {
        question: "BIC 里会出现 0 或 1 吗？",
        answer:
          "会，但只出现在第 7–11 位。前 6 位恒为字母，这是识别录入错误最快的办法。",
      },
      {
        question: "SEPA 付款需要 BIC 吗？",
        answer:
          "欧元区内的 SEPA 转账仅凭 IBAN 即可路由，BIC 可选；欧元区外通常必须有 BIC。",
      },
    ],
  },
};

export default guide;
