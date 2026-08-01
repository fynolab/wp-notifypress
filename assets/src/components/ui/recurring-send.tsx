import {Cron} from 'react-js-cron'
import 'react-js-cron/dist/styles.css'
import React from 'react'

const RecurringSend = ({value, setValue}) => {
  return (
    <Cron
      value={value}
      setValue={setValue}
      clockFormat={'12-hour-clock'}
      shortcuts={true}
      allowEmpty='never'
    />
  );
};

export {RecurringSend}
