import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RegisterOrganizer } from './register-organizer';

describe('RegisterOrganizer', () => {
  let component: RegisterOrganizer;
  let fixture: ComponentFixture<RegisterOrganizer>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RegisterOrganizer]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RegisterOrganizer);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
