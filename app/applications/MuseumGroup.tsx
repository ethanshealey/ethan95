import { MuseumItem } from '@/lib/museum'
import React from 'react'
import { Frame, Separator } from 'react95'

type MuseumGroupType = {
    title: string,
    description: string,
    data: MuseumItem[]
}

const MuseumGroup = ({ title, description, data }: MuseumGroupType) => {
    return (
        <div>
            <Frame variant='well' style={{ 
                paddingLeft: '10px',
                paddingRight: '10px'
             }}>
                <h4>{title}</h4>
                <p>{description} {`I currently have ${data?.length} ${title?.toLowerCase()}, originating from between ${data[0]?.year} and ${data.slice(-1)[0]?.year}`}</p>
                <Separator style={{ marginBottom: '10px' }} />
                {
                    data.map((item: MuseumItem, idx: number) => (
                        <div className='museum-item-wrapper'>
                            <div className='museum-title'>
                                <b>{ item.name }</b> | { item.year }
                            </div>
                            <div className='museum-photo'>
                                <img src={item.image} width={'50%'} style={{ maxWidth: '200px' }} />
                            </div>
                            <p>{ item.description }</p>
                            { idx !== data?.length - 1 && <Separator /> }
                        </div>
                    ))
                }
            </Frame>
        </div>
    )
}

export default MuseumGroup