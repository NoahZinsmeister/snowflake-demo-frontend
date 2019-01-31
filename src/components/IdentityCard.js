import React, { useState, useRef, useEffect } from 'react'
import classnames from 'classnames'
import Card from '@material-ui/core/Card';
import Divider from '@material-ui/core/Divider';
import Typography from '@material-ui/core/Typography';
import Badge from '@material-ui/core/Badge';
import Button from '@material-ui/core/Button';
import Tooltip from '@material-ui/core/Tooltip';
import { makeStyles } from '@material-ui/styles';
import { ReactComponent as DaiLogo } from '../assets/dai.svg'
import { ReactComponent as HydroLogo } from '../assets/hydro.svg'

const useStyles = makeStyles(theme => ({
  header: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center'
  },
  headerText: {
    marginTop: '.5em !important'
  },
  hrContent: {
    width: '80%',
    marginTop: '.5em !important'
  },
  card: {
    display: 'flex',
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center'
  },
  cardContent: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    margin: '1em'
  },
  identiconCardContent: {
    width: '150px',
    height: '150px',
    marginLeft: '-7px',
    marginRight: '-7px'
  },
  balancesCardContent: {
  },
  balanceRow: {
    marginTop: '.25em',
    marginBottom: '.25em',
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  balanceRowLabel: {
    display: 'unset !important'
  },
  logo: {
    height: '1.5em',
    width: '1.5em',
    marginRight: '.25em'
  },
  ticker: {
    marginRight: '.75em'
  },
  balance: {
    flex: '1 1 auto'
  },
  textSecondary: {
    color: theme.palette.text.secondary
  },
  badge: {
    verticalAlign: 'bottom !important',
    height: '10px !important',
    minWidth: '10px !important'
  },
  hoverTooltip: {
    fontSize: '12px !important',
    backgroundColor: 'white'
  }
}))

export function Balances ({ snowflakeBalance, daiBalance }) {
  const classes = useStyles()

  return (
    <div className={classnames(classes.cardContent, classes.balancesCardContent)}>
      <Tooltip
        title="HYDRO is the native token of Snowflake."
        placement="top"
        enterTouchDelay={0}
        leaveTouchDelay={1250}
        classes={{tooltip: classes.hoverTooltip}}
      >
        <Button disableRipple={true} classes={{ label: classes.balanceRowLabel }}>
          <div className={classes.balanceRow}>
            <div className={classes.logo}>
              <HydroLogo />
            </div>
            <div className={classes.ticker}>
              <Typography variant="h6" align='center' color='textSecondary'>
                HYDRO
              </Typography>
            </div>
            <div className={classes.balance}>
              <Typography variant="h6" align='right'>
                {snowflakeBalance && snowflakeBalance.toLocaleString()}
              </Typography>
            </div>
          </div>
        </Button>
      </Tooltip>

      <Tooltip
        title="DAI is a stablecoin pegged to USD."
        placement="top"
        enterTouchDelay={0}
        leaveTouchDelay={1250}
        classes={{tooltip: classes.hoverTooltip}}
      >
        <Button disableRipple={true} classes={{ label: classes.balanceRowLabel }}>
          <div className={classes.balanceRow}>
            <div className={classes.logo}>
              <DaiLogo />
            </div>
            <div className={classes.ticker}>
              <Typography variant="h6" align='center' color='textSecondary'>
                DAI
              </Typography>
            </div>
            <div className={classes.balance}>
              <Typography variant="h6" align='right'>
                {daiBalance && daiBalance.toLocaleString()}
              </Typography>
            </div>
          </div>
        </Button>
      </Tooltip>
    </div>
  )
}

export default function IdentityCard ({ wallet, ein, snowflakeBalance, daiBalance, showBadge }) {
  const classes = useStyles()

  const [badgeHovered, setBadgeHovered] = useState(false)

  const identiconRef = useRef()

  const identicon = useRef(window.hydroIdenticon.create({
    seed: wallet.address,
    size: 150
  }))

  useEffect(() => {
    if (identiconRef.current) {
      identiconRef.current.innerHTML = ''
      identiconRef.current.appendChild(identicon.current)
    }
  })

  return (
    <Card>
      <div className={classes.header}>
        <div className={classes.headerText}>
          <Tooltip
            title="EINs - Ethereum Identification Numbers - are unique account identifiers."
            placement="top"
            enterTouchDelay={0}
            leaveTouchDelay={1250}
            classes={{tooltip: classes.hoverTooltip}}
          >
            <Badge invisible={badgeHovered || !showBadge} classes={{badge: classes.badge}} color="secondary" variant='standard'>
              <Button onMouseEnter={() => setBadgeHovered(true)} disableRipple={true}>
                <Typography variant="h6" align='center'>
                  <span className={classes.textSecondary}>EIN</span> {ein}
                </Typography>
              </Button>
            </Badge>
          </Tooltip>
        </div>
        <Divider className={classes.hrContent} />
      </div>

      <div className={classes.card}>
        <div className={classnames(classes.cardContent, )}>
          <div className={classes.identiconCardContent} ref={identiconRef} />
        </div>
        <Balances snowflakeBalance={snowflakeBalance} daiBalance={daiBalance} />
      </div>
    </Card>
  )
}
