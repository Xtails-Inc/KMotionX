import {Component,Inject, Input, Output} from 'angular2/core';
import {ScreenComponent} from "../screen.component"
@Component({
    selector: 'laser-calc-screen',
    //directives: [Alert,Hello],
    templateUrl:'dist/app/laser/laser-calc.html'
})
export class LaserCalculatorComponent extends ScreenComponent{ 
    //@Input()
    calc = {
        pulseWidth:2,
        ppi:1200,
        feedRate:250,
        powerSetting:100,
        power:40
    }

    constructor(){
      super()
    }
    
    onTest(){
      console.log(this.calc);
    }
    
    ppmm(){
      return this.calc.ppi/25.4;
    }
    
    pps(){
      return this.ppmm()*this.calc.feedRate / 60;
    }

    pulsePeriod(){
      return 1/this.pps()*1000;
    }
    dutyCycle(){
      return this.calc.pulseWidth/this.pulsePeriod()*100;
    }
      
    energyPerPulse(){
      return this.calc.power*this.calc.pulseWidth/1000*this.calc.powerSetting/100;
    }
    energyDensity(){
      return this.ppmm()*this.energyPerPulse();
    }
    powerToMaterial(){
      return this.pps()*this.energyPerPulse();
    }
    
}