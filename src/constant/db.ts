import {} from 'koishi';

declare module 'koishi' {
  interface Tables {
    ffxiv_bot_aidon_default_server: DefaultServerTable;
  }
}

// 这里是新增表的接口类型
export interface DefaultServerTable {
  id: number;
  targetId: string; // channelId
  targetType: number; // 0 群，频道；1 私聊；
  default_server: string;
  created_at: Date;
  created_by: string;
  updated_at: Date;
  updated_by: string;
}
