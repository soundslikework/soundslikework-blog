// Global data
type Config = {
  title: string;
  description: string;
  lang: string;
  favicon: string;
  og: {
    image: string,
    imageAlt: string,
    imageType: string,
    imageWidth: string,
    imageHeight: string,
  }
}

export const siteConfig: Config = {
  title: "soundslikework",
  description: "I make noise in real life and talk about it on the internet",
  lang: "en",
  favicon: "/favicon.svg",
  og: {
    image: "/ogImage.png",
    imageAlt: "Open Graph image for the soundslikework website",
    imageType: "image/png",
    imageWidth: "512",
    imageHeight: "512",
  }
}

