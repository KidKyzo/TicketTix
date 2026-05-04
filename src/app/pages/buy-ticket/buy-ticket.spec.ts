import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BuyTicket } from './buy-ticket';

describe('BuyTicket', () => {
  let component: BuyTicket;
  let fixture: ComponentFixture<BuyTicket>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BuyTicket]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BuyTicket);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
