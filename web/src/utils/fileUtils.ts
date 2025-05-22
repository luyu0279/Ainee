import { ContentMediaType } from "@/types/fileTypes";

// Helper function to get icon path based on media type
export const getItemIcon = (mediaType: ContentMediaType): string => {
  switch (mediaType) {
    case ContentMediaType.video:
      return '/icon/icon_file_video.png';
    case ContentMediaType.pdf:
      return '/icon/icon_pdf_add.png';
    case ContentMediaType.audio:
    case ContentMediaType.audioInternal:
    case ContentMediaType.audioMicrophone:
      return '/icon/icon_item_voice.png';
    case ContentMediaType.word:
      return '/icon/icon_item_word.png';
    case ContentMediaType.image:
      return '/icon/icon_item_image.png';
    case ContentMediaType.ppt:
      return '/icon/icon_item_ppt.png';
    case ContentMediaType.text:
      return '/icon/icon_item_txt.png';
    case ContentMediaType.excel:
      return '/icon/icon_item_xls.png';
    case ContentMediaType.link:
    default:
      return '/icon/icon_link.png';
  }
}; 