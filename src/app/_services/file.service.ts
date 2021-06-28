import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import * as beautify from 'xml-beautifier';
import { createClient, WebDAVClient, FileStat, ResponseDataDetailed } from "webdav/web";

import { User } from '@/_models';
import { AuthenticationService } from './authentication.service';
import { url } from 'inspector';

@Injectable({ providedIn: "root" })
export class FileService {
  currentUser: User;
  davHeader = new HttpHeaders();
  davUrl: string = `${config.apiUrl}/remote.php/dav/files`;
  davClient: WebDAVClient;
  constructor(
    private http: HttpClient,
    private authenticationService: AuthenticationService
  ) {
    this.currentUser = this.authenticationService.currentUserValue;
    this.davUrl = `${this.davUrl}/${this.currentUser.uid}`;
    this.davHeader.append("Authorization", `Bearer ${this.currentUser.token}`);
    this.davClient = createClient(this.davUrl, {
      headers: {
        Authorization: `Bearer ${this.currentUser.token}`,
        "Content-Type": "application/xml; charset=utf-8",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Credentials": "true",
      },
    });
  }

  async getAll() {
    const body = `
            <?xml version="1.0"?>
            <d:propfind  xmlns:d="DAV:" xmlns:oc="http://owncloud.org/ns" xmlns:nc="http://nextcloud.org/ns">
                <d:prop>
                    <d:getlastmodified />
                    <d:getetag />
                    <d:resourcetype />
                    <d:getcontenttype/>
                    <oc:fileid />
                    <oc:permissions />
                    <oc:size />
                    <oc:favorite />
                    <oc:comments-unread />
                    <oc:owner-display-name />
                    <oc:share-types />
                    <d:getcontentlength />
                </d:prop>
            </d:propfind>
        `;
    return this.davClient
      .getDirectoryContents("/", {
        data: beautify(body),
        details: true,
      })
      .then((files: ResponseDataDetailed<FileStat[]>) => {
        files.data.map((file: FileStat) => {
          file["formatBytes"] = this.formatBytes(file.size);
          if (file.mime) {
            file["fileType"] = this.fileType(file.mime);
          }
          if(file.type === 'directory'){
            file["fileType"] = 'fa fa-folder';
            file["formatBytes"] = this.formatBytes(file.props['size']);
          }
          file.lastmod = this.formatDate(file.lastmod);
          return file;
        });
        return files;
      }).catch((error) => {
        console.warn('error', error);
        this.authenticationService.logout();
      });
  }

  fileType(fileType: string) {
    const acceptedImageTypes = ["image/gif", "image/jpeg", "image/png"];
    if (fileType && acceptedImageTypes.indexOf(fileType) !== -1) {
      return "fa fa-picture-o";
    }
    return "fa fa-file";
  }

  formatDate(lastMod: string) {
    let d = new Date(lastMod);
    let ye = new Intl.DateTimeFormat("en", { year: "numeric" }).format(d);
    let mo = new Intl.DateTimeFormat("en", { month: "short" }).format(d);
    let da = new Intl.DateTimeFormat("en", { day: "2-digit" }).format(d);
    return `${da}-${mo}-${ye}`;
  }

  formatBytes(bytes: number, decimals = 2) {
    if (bytes === 0) return "0 Bytes";

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
  }

  detail(user: User) {
    return this.http.post(`${config.apiUrl}/users/register`, user);
  }

  async download(name: string) {
    return await this.davClient
      .customRequest(name, {
        method: "GET",
        responseType: "blob",
      }).then((response: any) => {
        this.downloadBlob(new Blob([response.data]), name);
      });
  }

  downloadBlob(blob, name = "file.txt") {
    // Convert your blob into a Blob URL (a special url that points to an object in the browser's memory)
    const blobUrl = URL.createObjectURL(blob);

    // Create a link element
    const link = document.createElement("a");

    // Set link's href to point to the Blob URL
    link.href = blobUrl;
    link.download = name;

    // Append link to the body
    document.body.appendChild(link);

    // Dispatch click event on the link
    // This is necessary as link.click() does not work on the latest firefox
    link.dispatchEvent(
      new MouseEvent("click", {
        bubbles: true,
        cancelable: true,
        view: window,
      })
    );

    // Remove link from body
    document.body.removeChild(link);
  }

  async upload(
    name: string,
    imageBuffer,
    overwrite: boolean = true
  ): Promise<Boolean> {
    return await this.davClient.putFileContents(name, imageBuffer, {
      overwrite,
      contentLength: false,
    });
  }


  async delete(name: string) {
    return await this.davClient
      .customRequest(name, {
        method: "DELETE"
      });
  }

}