const locale_defualt: string = 'zh-CN';
const locale_settings = {
  get default(): string {
    return locale_defualt;
  },
  current: <string>locale_defualt
};

export { locale_settings };
