declare module "dom-to-image-more" {
  interface Options {
    scale?: number;
    width?: number;
    height?: number;
    bgcolor?: string;
    style?: Partial<CSSStyleDeclaration>;
    quality?: number;
    cacheBust?: boolean;
  }
  const domtoimage: {
    toPng(node: HTMLElement, options?: Options): Promise<string>;
    toJpeg(node: HTMLElement, options?: Options): Promise<string>;
    toSvg(node: HTMLElement, options?: Options): Promise<string>;
    toBlob(node: HTMLElement, options?: Options): Promise<Blob>;
    toPixelData(node: HTMLElement, options?: Options): Promise<Uint8ClampedArray>;
  };
  export default domtoimage;
}
