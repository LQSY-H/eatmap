import Link from "next/link";

const sections: { title: string; paragraphs: string[] }[] = [
  {
    title: "一、服务说明",
    paragraphs: [
      "食图（以下简称「本平台」）为用户提供餐饮店铺与菜品的浏览、地图展示、收藏与评价等信息服务。平台上展示的店铺名称、地址、菜品图片及文案等信息主要由入驻商户或用户上传，本平台力求展示准确，但不对商户线下经营状况、价格时效、排队情况等作实时担保。",
    ],
  },
  {
    title: "二、账户注册与使用",
    paragraphs: [
      "1. 您应使用本人真实、合法、有效的邮箱或手机号等信息完成注册，并妥善保管账号与密码。因您保管不善导致的损失，由您自行承担。",
      "2. 您的账号仅供本人使用，未经本平台书面同意，不得转让、出借或以其他方式提供给第三方使用。",
      "3. 如发现账号被盗用或存在安全风险，请尽快联系平台管理员寻求协助。",
    ],
  },
  {
    title: "三、内容与行为规范",
    paragraphs: [
      "1. 您在本平台发布的评价、图片、昵称等内容，应遵守法律法规，尊重他人合法权益，不得含有虚假、诽谤、淫秽、暴力、歧视或侵犯知识产权等内容。",
      "2. 您理解评价属于主观体验表达，应基于真实消费或合理认知，避免恶意差评、刷单或与事实严重不符的陈述。",
      "3. 本平台有权依据法律法规及平台规则，对违规内容采取删除、隐藏、限制功能或终止服务等措施，且无需事先征得用户同意；情节严重时可配合主管部门依法处理。",
    ],
  },
  {
    title: "四、商户与用户关系",
    paragraphs: [
      "本平台主要提供信息展示与互动工具。您与商户之间就餐饮消费、退款、发票等产生的法律关系，由您与商户自行协商或通过合法途径解决，本平台可在合理范围内提供必要协助，但不构成对交易结果的担保。",
    ],
  },
  {
    title: "五、知识产权",
    paragraphs: [
      "本平台界面设计、程序、标识等知识产权归运营方或权利人所有。未经许可，您不得复制、传播或用于商业目的。您在本平台上传的内容，授权本平台在提供服务所必需的范围内使用与展示。",
    ],
  },
  {
    title: "六、免责声明",
    paragraphs: [
      "因不可抗力、网络故障、系统维护、第三方服务异常等非本平台可控原因导致的服务中断或数据丢失，本平台将在合理范围内尽力修复，但不承担由此造成的间接损失。法律法规另有强制性规定的除外。",
    ],
  },
  {
    title: "七、隐私保护",
    paragraphs: [
      "本平台将按照法律法规要求处理您的个人信息，用于账号注册、登录安全、功能实现及改进体验等目的。详细收集范围、保存期限与您的权利等事项，以届时公布的《隐私政策》为准。",
    ],
  },
  {
    title: "八、须知修订",
    paragraphs: [
      "本平台有权根据业务与法律要求修订本须知，修订内容将于本平台公示后生效。您继续使用服务即视为接受修订后的内容；若您不同意，请停止使用并可申请注销账号。",
    ],
  },
  {
    title: "九、联系我们",
    paragraphs: [
      "与本须知相关的疑问或投诉，可通过站点公示的联系方式与运营方取得联系。",
    ],
  },
];

export default function UserNoticePage() {
  return (
    <div className="mx-auto min-h-0 w-full max-w-2xl px-4 py-8 max-md:py-6">
      <Link href="/register" className="text-xs font-medium text-amber-800 hover:underline">
        ← 返回注册
      </Link>
      <h1 className="mt-4 text-xl font-bold text-amber-950 max-md:text-lg">食图用户须知</h1>
      <p className="mt-2 text-xs text-amber-800/75 max-md:text-[11px]">
        欢迎使用食图。请仔细阅读以下内容；注册或使用服务即表示您已理解并同意相关约定。
      </p>
      <article className="mt-8 space-y-8 text-sm leading-relaxed text-amber-950/90 max-md:text-xs">
        {sections.map((s) => (
          <section key={s.title}>
            <h2 className="font-semibold text-amber-950">{s.title}</h2>
            <div className="mt-2 space-y-2 text-amber-900/85">
              {s.paragraphs.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          </section>
        ))}
      </article>
    </div>
  );
}
