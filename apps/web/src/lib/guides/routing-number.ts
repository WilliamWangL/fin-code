import type { Guide } from "./types";

const guide: Guide = {
  slug: "routing-number",
  family: "ABA_ROUTING",
  reviewed: "2026-11-03",
  en: {
    title: "US ABA routing numbers: the checksum, and Fedwire versus ACH",
    description:
      "Nine digits, the last of which is a weighted checksum. How a routing number identifies an institution rather than a branch, and why the same number can fail on one rail and work on another.",
    intro: [
      "A routing transit number - also called an ABA number - is the nine-digit code that identifies a US financial institution in the payment system. Unlike most national branch codes, it usually identifies the institution or a processing region, not one counter in one city.",
    ],
    sections: [
      {
        id: "structure",
        heading: "Nine digits with a real checksum",
        paragraphs: [
          "The first two digits are the Federal Reserve district and office that process the payment. The next six identify the institution. The ninth is a check digit computed with the repeating weights 3, 7, 1 over the preceding eight digits.",
          "Because the check digit is arithmetic, a single transposed pair is caught before the payment is submitted - one of the few bank codes you can validate offline with complete confidence.",
        ],
        table: {
          headers: ["Part", "Digits", "Meaning"],
          rows: [
            ["District", "1-2", "Federal Reserve district and office"],
            ["Institution", "3-8", "Financial institution"],
            ["Check digit", "9", "Weighted 3-7-1 checksum"],
          ],
        },
      },
      {
        id: "fedwire-vs-ach",
        heading: "Fedwire and ACH do not use the same number",
        paragraphs: [
          "A large bank may publish separate routing numbers for wire transfers and for ACH: the first routes a high-value, same-day Fedwire payment, the second a batch ACH debit or credit. Using the ACH number for a wire is a routine error and the payment will be rejected or arrive late.",
          "When a form only says routing number, check which rail the payment will take. When it says wire routing number, use the Fedwire value.",
        ],
      },
      {
        id: "branch",
        heading: "Where the branch is recorded",
        paragraphs: [
          "US payments do not carry a branch code. The account number is the only branch-level information, and some banks encode a branch into it internally.",
          "That is why an international payment into the US needs the routing number, the account number and - for anything other than a domestic transfer - the SWIFT/BIC of the receiving bank.",
        ],
      },
      {
        id: "mistakes",
        heading: "Failures worth knowing",
        paragraphs: [
          "Checksum-valid numbers still fail when they belong to a closed institution, when a bank has merged and the successor uses a different number, or when the payer used the wire number for an ACH entry.",
          "A routing number never contains letters, and it is never eight digits. If a source shows eight, the leading zero was dropped by a spreadsheet.",
        ],
      },
    ],
    faq: [
      {
        question: "Can I check a routing number myself?",
        answer:
          "Yes. Apply the repeating weights 3, 7, 1 to the first eight digits, sum them, and the ninth digit must make the total a multiple of ten.",
      },
      {
        question: "Why does my bank have several routing numbers?",
        answer:
          "Different numbers are issued per state, per processing region, and per rail - wire versus ACH. The correct one depends on where the account was opened and how the money is sent.",
      },
    ],
  },
  zh: {
    title: "美国 ABA Routing Number：校验位，以及 Fedwire 与 ACH 的区别",
    description:
      "9 位数字，末位是加权校验位。讲清路由号标识的是机构而非分行，以及同一个号码为何在一条通道成功、另一条失败。",
    intro: [
      "Routing Transit Number（又称 ABA 号）是 9 位编码，在支付系统中标识一家美国金融机构。与多数国家的分行码不同，它通常标识机构或某个处理区域，而不是某个城市里的一个柜台。",
    ],
    sections: [
      {
        id: "structure",
        heading: "9 位数字，带真正的校验位",
        paragraphs: [
          "前 2 位是处理该笔付款的联邦储备区及其办事处。第 3–8 位标识机构。第 9 位是校验位，用 3、7、1 循环加权对前 8 位求和后得出。",
          "因为校验是纯算术，任何单个数字转置都能在提交前被发现——这是少数可以离线完全确认的银行编码之一。",
        ],
        table: {
          headers: ["部分", "位数", "含义"],
          rows: [
            ["储备区", "1-2", "联邦储备区及办事处"],
            ["机构", "3-8", "金融机构"],
            ["校验位", "9", "3-7-1 加权校验"],
          ],
        },
      },
      {
        id: "fedwire-vs-ach",
        heading: "Fedwire 与 ACH 用的不是同一个号",
        paragraphs: [
          "大型银行可能为电汇与 ACH 分别公布不同的路由号：前者路由当日大额 Fedwire 付款，后者路由批量 ACH 借贷记。用电汇号做 ACH 是常见错误，结果是退票或延迟。",
          "表单只写 routing number 时，先确认这笔款走哪条通道；写 wire routing number 时，必须用电汇号。",
        ],
      },
      {
        id: "branch",
        heading: "分行信息记在哪里",
        paragraphs: [
          "美国付款不带分行码。账号是唯一的分行级信息，部分银行会在账号内部编码分行。",
          "这也是为什么向美国汇款需要路由号、账号，并在非境内转账时额外提供收款行的 SWIFT/BIC。",
        ],
      },
      {
        id: "mistakes",
        heading: "值得警惕的失败情形",
        paragraphs: [
          "校验通过的号码仍可能失败：所属机构已关闭、银行合并后改用新的号码，或者付款人把电汇号填进了 ACH 字段。",
          "路由号不含字母，也绝不是 8 位。如果某个来源显示 8 位，通常是电子表格把前导零吃掉了。",
        ],
      },
    ],
    faq: [
      {
        question: "我能自己校验路由号吗？",
        answer:
          "可以。把 3、7、1 循环加权应用到前 8 位并求和，第 9 位必须让总和成为 10 的倍数。",
      },
      {
        question: "为什么我的银行有多个路由号？",
        answer:
          "不同州、不同处理区域、不同通道（电汇与 ACH）各会分配号码。用哪个取决于账户开在哪里、钱怎么汇。",
      },
    ],
  },
};

export default guide;
