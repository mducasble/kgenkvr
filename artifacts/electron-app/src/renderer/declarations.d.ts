declare module "*.module.css" {
  const styles: Record<string, string>;
  export default styles;
}

declare module "*.module.scss" {
  const styles: Record<string, string>;
  export default styles;
}

declare module "*.svg" {
  const url: string;
  export default url;
}

declare module "*.png" {
  const url: string;
  export default url;
}
