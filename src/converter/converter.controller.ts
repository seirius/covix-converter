import { Body, Controller, Get, HttpStatus, Param, Post, Res, ServiceUnavailableException, UploadedFile, UseInterceptors } from "@nestjs/common";
import { Response } from "express";
import * as fs from "fs";
import { FileStorage } from "src/util/util";
import { JobResponse, MultimediaInfo } from "./converter.data";
import { ConverterService } from "./converter.service";

@Controller("converter")
export class ConverterController {

    constructor(
        private readonly converterService: ConverterService
    ) {}

    private notAvailableCheck(): void {
        if (!this.converterService.available) {
            throw new ServiceUnavailableException("Converter is not available");
        }
    }

    @Post()
    @UseInterceptors(FileStorage)
    public async processJob(
        @UploadedFile() file: Express.Multer.File,
        @Body() job: JobResponse
    ): Promise<string> {
        this.notAvailableCheck();
        job.info = JSON.parse(<any>job.info);
        this.converterService.convert(job, file);
        return "ok";
    }
    
    @Post("probe-file")
    @UseInterceptors(FileStorage)
    public async getInfo(
        @UploadedFile() file: Express.Multer.File
        ): Promise<MultimediaInfo> {
        return this.converterService.probeFile(file.filename, file.originalname);
    }

    @Get("file/:fileId")
    public async getFile(
        @Param("fileId") fileId: string,
        @Res()
        response: Response,
    ): Promise<void> {
        const filePath = this.converterService.filePath(fileId);
        const stat = await fs.promises.stat(filePath);
        response.writeHead(HttpStatus.OK, {
            "Content-Length": stat.size,
            "Content-Type": "application/octet-stream",
            "Content-disposition": `attachment; filename=${fileId}`
        });
        fs
            .createReadStream(filePath)
            .on("end", () => this.converterService.deleteFile(fileId))
            .pipe(response);
    }

}