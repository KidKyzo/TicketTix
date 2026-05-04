import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MyTicketPages } from './my-ticket-pages';

describe('MyTicketPages', () => {
  let component: MyTicketPages;
  let fixture: ComponentFixture<MyTicketPages>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MyTicketPages]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MyTicketPages);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
