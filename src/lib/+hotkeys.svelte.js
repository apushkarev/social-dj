// @ts-nocheck

import { universalExport } from "./toolManagement"
import { selectTool } from "./toolManagement"
import { 
  panoControlsFooter,
  viewTool,
  // toggleDoorsButton
} from "../stores"
import { get } from "svelte/store"
import { globals } from "./globals.svelte"

export const setHotkeys = () => {
  document.addEventListener('keydown', handleKeyDown, false);
  document.addEventListener('keyup', handleKeyUp, false);
}

const handleKeyDown = event => {
  
  const ctrlPressed = event.ctrlKey 
  const altPressed = event.altKey 
  const shiftPressed = event.shiftKey

  globals.set('altPressed', altPressed)

  // if (ctrlPressed && altPressed) {

  //   switch (event.key) {
      
  //     case 'ArrowUp':
        
  //       break

  //     case 'ArrowRight':
        
  //       break

  //     case 'ArrowDown':
        
  //       break

  //     case 'ArrowLeft':
          
  //       break
  //   }
  // }

  if (shiftPressed && ctrlPressed && event.key == 'K') {
    //
  }

  if (shiftPressed && ctrlPressed && event.key == 'D') {
    // 
  }

  if (ctrlPressed && !altPressed && +event.key >= 1 && +event.key <= 9) {

    // 
  }

  if (ctrlPressed && !altPressed && +event.key == 0) {

    // 
  }

  if (ctrlPressed && !altPressed && +event.key == 0) {

    // 
  }

  if (ctrlPressed && event.key == 'k') {
    // 
  }
  
  if (ctrlPressed && event.key == 'g') {
    // 
  }

  if (
    ctrlPressed
    && (event.key == 'd')

  ) {
    // 
  }
}

const handleKeyUp = event => {
  globals.set('altPressed', event.altKey);
}
