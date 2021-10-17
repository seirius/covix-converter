export interface VideoStream {
    index: number;
    codecName: string;
    codecLongName: string;
    selected?: boolean;
}

export interface AudioStream {
    index: number;
    lang: string;
    codecName: string;
    codecLongName: string;
    title: string;
    selected?: boolean;
}

export interface SubtitleStream {
    index: number;
    lang: string;
    codecName: string;
    codecLongName: string;
    title: string;
    selected?: boolean;
}

export class MultimediaInfo {
    originalName?: string;
    duration: number;
    filename: string;
    crf: number;
    videos: VideoStream[];
    audios: AudioStream[];
    subtitles: SubtitleStream[];
}

export enum Formats {
    MP4 = "mp4"
}

export enum VideoCodec {
    H264 = "libx264",
    COPY = "copy"
}

export enum AudioCodec {
    AAC = "aac",
    COPY = "copy"
}

export interface JobResponse {
    id: string;
    mediaId: string;
    info: MultimediaInfo;
    outputFormat?: string;
    outputVideoCodec?: string;
    outputAudioCodec?: string;
}