import { version } from "../../package.json";

const LOGO = " _       __           __   _   __          __ \n| |     / /___  _____/ /__/ | / /__  _____/ /_\n| | /| / / __ \\/ ___/ //_/  |/ / _ \\/ ___/ __/\n| |/ |/ / /_/ / /  / ,< / /|  /  __(__  ) /_  \n|__/|__/\\____/_/  /_/|_/_/ |_/\\___/____/\\__/  ";

export function printBanner(): void {
  console.log(LOGO);
  console.log(`:: WorkNest API ::                        (v${version})\n`);
}
