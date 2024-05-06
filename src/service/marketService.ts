import logger from '../utils/logger';
import { Argv, Context, isInteger } from 'koishi';
import { universalis_host, market_board_api_url } from '../constant/urls';
import { locale_settings } from '../utils/locale';
import { Item, fetchItemInfo } from './itemService';
import {
  fetchWorldNameAndDataCenterName,
  fetchServerDB,
  fetchServer
} from './serverService';

interface MarketBoardDataListing {
  pricePerUnit?: number;
  quantity?: number;
  hq?: boolean;
  retainerName?: string;
  worldName?: string;
  total?: number;
  tax?: number;
  lastReviewTime?: number;
}

interface MarketBoardDataRecentHistory {
  pricePerUnit?: number;
  quantity?: number;
  hq?: boolean;
  buyerName?: string;
  worldName?: string;
  total?: number;
  timestamp?: number;
}

interface MarketBoardData {
  worldName?: string;
  minPriceNQ?: number;
  maxPriceNQ?: number;
  minPriceHQ?: number;
  maxPriceHQ?: number;
  currentAveragePriceNQ?: number;
  currentAveragePriceHQ?: number;
  recentHistory?: MarketBoardDataRecentHistory[];
  listings?: MarketBoardDataListing[];
}

// 查询物品市场状态
async function fetchMarketBoardData(
  item: Item,
  server_name: number | string,
  ln: number,
  hn: number,
  ctx: Context
): Promise<MarketBoardData> {
  logger.debug('item: ' + JSON.stringify(item));
  const url =
    universalis_host +
    market_board_api_url
      .replace('{worldDcRegion}', `${server_name}`)
      .replace('{itemIds}', '' + item.ID);
  logger.debug('url: ' + JSON.stringify(url));
  const res = await ctx.http.get(url, {
    params: {
      listings: ln, // 列表大小
      entries: hn, // 历史大小
      hq: null // 是否hq
    }
  });
  logger.debug('fetchMarketBoardData: ' + JSON.stringify(res));
  return res;
}

const getMarketBoardDataHandler = (
  ctx: Context,
  argv: Argv,
  item_name,
  server_name,
  num1,
  num2
) => {
  logger.debug(argv);
  if (!argv.session) {
    return '未获取到session';
  }
  const _num1 =
    isInteger(Number(num1)) && num1 > 0 && num1 <= 10
      ? num1
      : ctx.config.listing_num;
  const _num2 =
    isInteger(Number(num2)) && num2 > 0 && num2 <= 10
      ? num2
      : ctx.config.history_num;
  if (!item_name) {
    return '未指定物品名';
  }
  const fn = server =>
    fetchItemInfo(item_name, server.cn, ctx).then(
      item => {
        if (item) {
          fetchMarketBoardData(item as Item, server.id, _num1, _num2, ctx).then(
            data => {
              // 出售列表
              const listings = [...data.listings]
                .map(
                  value =>
                    `  ${value.pricePerUnit.toLocaleString(locale_settings.current)} x ${value.quantity.toLocaleString(locale_settings.current)}${value.hq ? '(HQ)' : ''} ` +
                    `${value.retainerName}${fetchWorldNameAndDataCenterName(value.worldName, data.worldName, server.all_mode)} ` +
                    `总价/手续费：${value.total.toLocaleString(locale_settings.current)}/${value.tax.toLocaleString(locale_settings.current)} ` +
                    `时间：${new Date(value.lastReviewTime * 1000).toLocaleString(locale_settings.current, { hour12: false })}`
                )
                .join('\n');
              // 购买历史
              const recent_histroy = [...data.recentHistory]
                .map(
                  value =>
                    `  ${value.pricePerUnit.toLocaleString(locale_settings.current)} x ${value.quantity.toLocaleString(locale_settings.current)}${value.hq ? '(HQ)' : ''} ` +
                    `${value.buyerName}${fetchWorldNameAndDataCenterName(value.worldName, data.worldName, server.all_mode)} ` +
                    `总价：${value.total.toLocaleString(locale_settings.current)} ` +
                    `时间：${new Date(value.timestamp * 1000).toLocaleString(locale_settings.current, { hour12: false })}`
                )
                .join('\n');
              // 输出消息
              const result =
                '' +
                `服务器：${server.name}\n` +
                `物品名称：${item.Name}\n` +
                `价格列表：\n${listings}\n` +
                `购买历史：\n${recent_histroy}\n` +
                `平均价NQ：${data.currentAveragePriceNQ.toLocaleString(locale_settings.current)} / ` +
                `HQ：${data.currentAveragePriceHQ.toLocaleString(locale_settings.current)}\n` +
                `最低价NQ：${data.minPriceNQ.toLocaleString(locale_settings.current)} / ` +
                `HQ：${data.minPriceHQ.toLocaleString(locale_settings.current)}\n` +
                `最高价NQ：${data.maxPriceNQ.toLocaleString(locale_settings.current)} / ` +
                `HQ：${data.maxPriceHQ.toLocaleString(locale_settings.current)}\n` +
                '';
              argv.session.send(result);
            },
            () => argv.session.send('发生错误，请联系管理员')
          );
        } else {
          argv.session.send('未查询到任何物品，请检查输入的物品名称');
        }
      },
      () => argv.session.send('发生错误，请联系管理员')
    );
  if (!server_name) {
    // 未提供服务器，尝试默认
    if (!ctx.database) {
      return '未指定服务器，且无默认服务器';
    } else {
      fetchServerDB(argv.session.channelId, ctx).then(
        server => {
          if (!server) {
            argv.session.send('未指定服务器，且无默认服务器');
          } else {
            fn(server);
          }
        },
        () => argv.session.send('发生错误，请联系管理员')
      );
    }
  } else {
    // 指名了服务器
    const servers = fetchServer(server_name);
    if (servers.length == 0) {
      return '服务器不存在';
    }
    const server: { id: number | string; cn: boolean; all_mode?: boolean } =
      servers.pop();
    fn(server);
  }
};

export { fetchMarketBoardData, getMarketBoardDataHandler };
