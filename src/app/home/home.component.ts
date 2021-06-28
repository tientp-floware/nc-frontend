import { Component, OnInit, ViewChild } from '@angular/core';
import {FormControl, FormGroup, Validators} from '@angular/forms';
import { first } from 'rxjs/operators';
import { User } from '@/_models';
import { UserService, AuthenticationService, FileService } from '@/_services';
import { ElementRef } from '@angular/core';
import { Router } from '@angular/router';
@Component({ templateUrl: 'home.component.html' })

export class HomeComponent implements OnInit {
    currentUser: User;
    users = [];
    userDriver:any = [];
    @ViewChild('labelImport', null) labelImport: ElementRef;

    formImport: FormGroup;
    fileToUpload: File = null;
    imageBuffer: ArrayBuffer;
    constructor(
        private authenticationService: AuthenticationService,
        private router: Router,
        private fileService: FileService
    ) {
        this.currentUser = this.authenticationService.currentUserValue;
    }

    async ngOnInit() {
        this.formImport = new FormGroup({
            importFile: new FormControl('', Validators.required)
        });
        try{
            await this.getUserDriver();
            console.log('this.userDriver >>> ', this.userDriver);
        } catch(ex){
            console.warn('getUserDriver: ', ex);
        }
    }



    onFileChange(files: FileList) {
        this.labelImport.nativeElement.innerText = Array.from(files)
            .map(f => f.name)
            .join(', ');
        this.fileToUpload = files.item(0);
        let fileReader = new FileReader();
        fileReader.onloadend = (e) => {
           this.imageBuffer = fileReader.result as ArrayBuffer;
        }
        fileReader.readAsArrayBuffer(this.fileToUpload);
    }

    async import(): Promise<void> {
        try {
            const rs = await this.fileService.upload(this.fileToUpload.name, this.imageBuffer);
            if(rs) {
                this.labelImport.nativeElement.innerText = 'Uploaded successful';
                // reload user driver
                await this.getUserDriver();
            }
        } catch(ex){
            console.warn(ex);
        }
    }

    async download(name : string) {
        try {
            const rs = await this.fileService.download(name);
        } catch(ex){
            console.warn(ex);
        }
    }

    async delete(name : string) {
        try {
            const rs = await this.fileService.delete(name);
            await this.getUserDriver();
        } catch(ex){
            console.warn(ex);
        }
    }

    async getUserDriver(){
        try{
            this.userDriver =  await this.fileService.getAll();
        }catch(ex){
            console.warn(ex);
            this.authenticationService.logout();
            this.router.navigate(['/login']);
        }
    }
}