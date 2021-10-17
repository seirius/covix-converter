import { Injectable, Logger } from "@nestjs/common";
import * as ffmpeg from "fluent-ffmpeg";
import { join, basename, extname } from "path";
import { CovixConfig } from "src/config/CovixConfig";
import { promises } from "fs";
import { AudioStream, JobResponse, MultimediaInfo, SubtitleStream, VideoStream } from "./converter.data";
import { SocketService } from "src/socket/socket.service";
import { SOCKET_EVENTS } from "src/socket/socket.data";
import { v4 as uuid } from "uuid";

@Injectable()
export class ConverterService {

    private _available = false;

    private static readonly LOGGER = new Logger(ConverterService.name);

    constructor(
        private readonly socketService: SocketService
    ) {
        setTimeout(() => this.setAvailable(), 2000);
    }

    public filePath(filename: string): string {
        return join(CovixConfig.FILE_PATH, filename);
    }

    public async deleteFile(filename: string): Promise<void> {
        await promises.unlink(this.filePath(filename));
    }

    private getVideoStreams(data: ffmpeg.FfprobeData): VideoStream[] {
        return data.streams
            .filter(({ codec_type }) => codec_type === "video")
            .map(({
                codec_name,
                codec_long_name,
                duration
            }, index) => ({
                index,
                codecName: codec_name,
                codecLongName: codec_long_name
            }));
    }

    private getAudioStreams(data: ffmpeg.FfprobeData): AudioStream[] {
        return data.streams
            .filter(({ codec_type }) => codec_type === "audio")
            .map(({
                codec_name,
                codec_long_name,
                tags
            }, index) => ({
                index,
                codecName: codec_name,
                codecLongName: codec_long_name,
                lang: tags?.language,
                title: tags?.title
            }));
    }

    private getSubtitleStreams(data: ffmpeg.FfprobeData): SubtitleStream[] {
        return data.streams
            .filter(({ codec_type }) => codec_type === "subtitle")
            .map(({
                codec_name,
                codec_long_name,
                tags
            }, index) => ({
                index,
                codecName: codec_name,
                codecLongName: codec_long_name,
                lang: tags?.language,
                title: tags?.title
            }));
    }

    public probeFile(filename: string, originalName: string): Promise<MultimediaInfo> {
        return new Promise((resolve, reject) => {
            ffmpeg.ffprobe(this.filePath(filename), async (error: Error, data: ffmpeg.FfprobeData) => {
                try {
                    await this.deleteFile(filename);
                } catch (error) {
                    reject(error);
                    return;
                }
                if (error) {
                    reject(error);
                    return;
                }
                resolve({
                    filename,
                    originalName,
                    videos: this.getVideoStreams(data),
                    audios: this.getAudioStreams(data),
                    subtitles: this.getSubtitleStreams(data),
                    crf: 24,
                    duration: data.format.duration
                });
            })
        });
    }

    public set available(status: boolean) {
        this._available = status;
        this.socketService.emit(SOCKET_EVENTS.AVAILABILITY, { status });
    }

    public get available(): boolean {
        return this._available;
    }

    public setAvailable(): void {
        this.available = true;
    }

    public setUnavailable(): void {
        this.available = false;
    }

    public extractSubtitle(file: Express.Multer.File, outputFile: string, index: number): Promise<void> {
        return new Promise((resolve, reject) => {
            ffmpeg(this.filePath(file.filename))
            .addOption(`-map 0:s:${index}`)
            .on("error", reject)
            .on("end", resolve)
            .output(outputFile)
            .run();
        });
    }

    public convertMedia(file: Express.Multer.File, outputFile: string, info: MultimediaInfo, output: {
        outputFormat: string;
        outputVideoCodec: string;
        outputAudioCodec: string;
    }, onProgress: Function): Promise<void> {
        return new Promise((resolve, reject) => {
            const ff = ffmpeg(this.filePath(file.filename))
            .on("progress", (progress) => onProgress(progress));
            ff.toFormat(output.outputFormat);
            ff.videoCodec(output.outputVideoCodec);
            ff.addOption(`-map 0:v:${info.videos.find(video => video.selected)?.index}`);
            ff.audioCodec(output.outputAudioCodec);
            ff.addOption(`-map 0:a:${info.audios.find(audio => audio.selected)?.index}`);
            ff.audioChannels(2);
            ff.addOption(`-crf ${info.crf}`);
            ff.addOption("-movflags");
            ff.addOption("+faststart");
            ff.on("error", reject)
            .on("end", resolve)
            .output(outputFile)
            .run();
        });
    }

    public async convert(job: JobResponse, file: Express.Multer.File): Promise<void> {
        this.setUnavailable();
        try {
            const originalFileName = `${basename(job.info.originalName, extname(job.info.originalName))}`;
            if (job.info.subtitles?.length) {
                const subsToExtract = job.info.subtitles.filter(({ selected }) => selected);
                for (let i = 0; i < subsToExtract.length; i++) {
                    const sub = subsToExtract[i];
                    const subFilename = uuid() + ".srt";
                    const subFilepath = this.filePath(subFilename);
                    await this.extractSubtitle(file, subFilepath, sub.index);
                    this.socketService.emit(SOCKET_EVENTS.TRACK_AVAILABLE, {
                        jobId: job.id,
                        originalName: `${sub.title}.${originalFileName}.srt`,
                        fileId: subFilename
                    });
                    this.socketService.emit(SOCKET_EVENTS.TRACK_PROGRESS, {
                        jobId: job.id,
                        current: i + 1,
                        of: subsToExtract.length
                    });
                }
            }
            const mediaName = uuid() + ".mp4";
            const mediaPath = this.filePath(mediaName);
            await this.convertMedia(file, mediaPath, job.info, {
                outputFormat: job.outputFormat,
                outputVideoCodec: job.outputVideoCodec,
                outputAudioCodec: job.outputAudioCodec
            }, ({ frames, timemark}) => this.socketService.emit(SOCKET_EVENTS.MEDIA_PROGRESS, { jobId: job.id, frames, timemark }));
            this.socketService.emit(SOCKET_EVENTS.MEDIA_AVAILABLE, {
                jobId: job.id,
                originalName: `${originalFileName}.${job.outputFormat}`,
                fileId: mediaName
            });
        } catch(error1) {
            const errorMessage = "Error converting file";
            this.socketService.emit(SOCKET_EVENTS.JOB_ERROR, {
                jobId: job.id,
                errorMessage,
                error: error1.message
            });
            ConverterService.LOGGER.error(errorMessage, error1);
        } finally {
            try {
                await this.deleteFile(file.filename);
            } catch (error2) {
                ConverterService.LOGGER.error("Error deleting a file", error2);
            } finally {
                this.setAvailable();
            }
        }
    }

}