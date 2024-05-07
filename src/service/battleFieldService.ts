import { Argv, Context } from 'koishi';
import { locale_settings } from '../utils/locale';
import { Config } from '../config/settings';
import { pvp_field_cn, pvp_start_time_stamp } from '../constant/pvp';
import logger from '../utils/logger';

const getBattleFieldInfoHandler = (
  ctx: Context,
  config: Config,
  argv: Argv
) => {
  if (!argv.session) {
    return '未获取到session';
  }
  const date = new Date(argv.session.event.timestamp);
  const date_str = `${date.toLocaleDateString(locale_settings.current)} ${ctx.i18n.get(date.getDay().toString())[locale_settings.current]}`;
  const cur =
    Math.floor((new Date().getTime() - pvp_start_time_stamp) / 86400_000) % 3;
  if (config.use_markdown_qq && config.templdate_id_pvp_qq && argv.session.qq) {
    const data = {
      msg_type: 2, // 2 markdown
      markdown: {
        custom_template_id: config.templdate_id_pvp_qq,
        params: [
          { key: 'date', values: [date_str] },
          { key: 'data1', values: [pvp_field_cn[cur]] },
          { key: 'data2', values: [pvp_field_cn[(cur + 1) % 3]] },
          { key: 'data3', values: [pvp_field_cn[(cur + 2) % 3]] }
        ]
      }
    };
    argv.session.qq.sendMessage(argv.session.channelId, data).then(
      res => {
        logger.info(res);
      },
      err => {
        logger.error(err);
      }
    );
  } else {
    return `今日：${date_str}\n今日战场：${pvp_field_cn[cur]}\n明日战场：${pvp_field_cn[(cur + 1) % 3]}\n后日战场：${pvp_field_cn[(cur + 2) % 3]}`;
  }
};

export { getBattleFieldInfoHandler };
