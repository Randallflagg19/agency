import { NgOptimizedImage } from '@angular/common';
import { Component } from '@angular/core';
import { ClassifiedStamp } from '../classified-stamp/classified-stamp';

@Component({
  selector: 'app-bureau-header',
  imports: [NgOptimizedImage, ClassifiedStamp],
  templateUrl: './bureau-header.html',
  styleUrl: './bureau-header.css',
})
export class BureauHeader {}
