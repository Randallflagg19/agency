import { Component, inject } from '@angular/core';
import { BureauHeader } from './bureau-header/bureau-header';
import { RouterOutlet } from '@angular/router';
import { AuthService } from './auth/auth.service';

@Component({
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
  imports: [BureauHeader, RouterOutlet],
})
export class App {
  private readonly auth = inject(AuthService);

  constructor() {
    this.auth.checkSession();
  }
}
