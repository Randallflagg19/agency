import { Component } from '@angular/core';
import { BureauHeader } from './bureau-header/bureau-header';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
  imports: [BureauHeader, RouterOutlet],
})
export class App {}
