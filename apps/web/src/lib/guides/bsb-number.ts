import type { Guide } from "./types";

const guide: Guide = {
  slug: "bsb-number",
  family: "BSB",
  reviewed: "2026-11-03",
  en: {
    title: "Australian BSB numbers: what the six digits tell you",
    description:
      "Bank-State-Branch: two digits for the bank, one for the state, three for the branch. How a BSB pairs with an account number and where payments go when a provider has none.",
    intro: [
      "A BSB number routes an Australian payment to a branch. The name says what the digits mean - Bank, State, Branch - and it is written as three groups of digits, 123-456, on statements and invoices.",
    ],
    sections: [
      {
        id: "structure",
        heading: "Bank, state, branch",
        paragraphs: [
          "The first two digits belong to the bank or financial institution. The third groups branches by state and by the bank's own internal ranges, which is why the state digit is not always the state you expect for a national brand.",
          "The final three digits identify the branch. Together with a six to nine digit account number they form the full routing information for a domestic transfer.",
        ],
        table: {
          headers: ["Part", "Digits", "Meaning"],
          rows: [
            ["Bank", "1-2", "Bank or financial institution"],
            ["State", "3", "State group and internal branch range"],
            ["Branch", "4-6", "Individual branch"],
          ],
        },
      },
      {
        id: "pairing",
        heading: "Pairing it with the account number",
        paragraphs: [
          "Australian domestic payments need the BSB and the account number, and the account number length varies by bank rather than being fixed nationally.",
          "Some forms label the field BSB, others call it a branch number; both mean the same six-digit value.",
        ],
      },
      {
        id: "rails",
        heading: "NPP, direct entry and PayID",
        paragraphs: [
          "The New Payments Platform settles transfers in seconds and is what most banking apps use. Direct entry covers bulk payments such as salaries five days a week.",
          "PayID is an overlay on top of the same rails: it addresses an account by phone number or email, so a payer can send money without knowing the BSB at all, although the underlying account still has one.",
        ],
      },
      {
        id: "missing",
        heading: "When an institution has no BSB",
        paragraphs: [
          "Payment institutions and some fintechs do not hold a BSB of their own and use a sponsor bank instead. The transfer is then routed with the sponsor's BSB and the customer's reference in the description.",
          "If you cannot find a BSB for an institution that should have one, check whether the branch was closed - BSBs are withdrawn when branches merge, and reused values are rare but not impossible.",
        ],
      },
    ],
    faq: [
      {
        question: "Is a BSB the same as an account number?",
        answer:
          "No. The BSB identifies the branch, the account number identifies the account, and an Australian domestic transfer needs both.",
      },
      {
        question: "Can I use a BSB for an international transfer to Australia?",
        answer:
          "The BSB routes the payment inside Australia; the sending bank also needs the Australian bank's SWIFT/BIC to reach it from abroad.",
      },
    ],
  },
  zh: {
    title: "澳洲 BSB 编码：6 位数字分别告诉你什么",
    description:
      "Bank-State-Branch：2 位银行、1 位州、3 位分行。讲清 BSB 如何与账号配对，以及服务商没有 BSB 时付款怎么走。",
    intro: [
      "BSB 编码把澳大利亚的一笔付款路由到具体分行。名字已经说明各位的含义——Bank、State、Branch——在流水与发票上写成三组数字，如 123-456。",
    ],
    sections: [
      {
        id: "structure",
        heading: "银行、州、分行",
        paragraphs: [
          "前 2 位属于银行或金融机构。第 3 位按州以及银行内部的区段对分行分组，因此对于全国性品牌，这一位未必是你预期的那个州。",
          "后 3 位标识具体分行。与 6–9 位的账号一起，构成境内转账所需的完整路由信息。",
        ],
        table: {
          headers: ["部分", "位数", "含义"],
          rows: [
            ["银行", "1-2", "银行或金融机构"],
            ["州", "3", "州分组与银行内部区段"],
            ["分行", "4-6", "具体分行"],
          ],
        },
      },
      {
        id: "pairing",
        heading: "与账号的配对",
        paragraphs: [
          "澳洲境内付款需要 BSB 加账号，且账号长度因银行而异，并非全国统一。",
          "有的表单把该字段叫 BSB，有的叫 branch number，指的都是同一个 6 位值。",
        ],
      },
      {
        id: "rails",
        heading: "NPP、Direct Entry 与 PayID",
        paragraphs: [
          "New Payments Platform 秒级清算，是多数银行 App 的默认通道。Direct Entry 承载工资等批量付款，每周运行五天。",
          "PayID 是叠加在同一套通道之上的寻址方式：用手机号或邮箱定位账户，付款方可以不填 BSB，但底层账户本身仍然有 BSB。",
        ],
      },
      {
        id: "missing",
        heading: "机构没有 BSB 时",
        paragraphs: [
          "支付机构与部分金融科技公司并不持有自己的 BSB，而是借用一家赞助银行。汇款使用赞助行的 BSB，备注里写客户信息。",
          "如果一家本应有 BSB 的机构查不到，先确认该分行是否已关闭——分行合并时 BSB 会被收回，被重新启用的值罕见但并非不可能。",
        ],
      },
    ],
    faq: [
      {
        question: "BSB 就是账号吗？",
        answer:
          "不是。BSB 标识分行，账号标识账户，澳洲境内转账两者都需要。",
      },
      {
        question: "向澳洲做跨境汇款需要 BSB 吗？",
        answer:
          "BSB 负责澳洲境内的路由；从境外汇入还需要澳洲银行的 SWIFT/BIC。",
      },
    ],
  },
};

export default guide;
