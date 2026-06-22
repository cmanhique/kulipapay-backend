// Usar o Prisma Client diretamente do @prisma/client
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
const bcrypt = require('bcrypt')

const OTP_LENGTH = 6
const OTP_MAX_ATTEMPTS = 3
const OTP_EXPIRY_MINUTES = 5

class OtpService {
  generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString()
  }

  async generateOtp(kp_id, type = 'LOGIN') {
    try {
      console.log(`🔐 Gerando OTP para ${kp_id} (${type})`)

      // Remover OTPs antigos
      await prisma.otpCode.deleteMany({
        where: {
          kp_id,
          type,
          used: false,
          expires_at: {
            lt: new Date()
          }
        }
      })

      const code = this.generateOTP()
      const hashedCode = await bcrypt.hash(code, 10)
      const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000)

      const otpRecord = await prisma.otpCode.create({
        data: {
          kp_id,
          code: hashedCode,
          type,
          expires_at: expiresAt,
          used: false,
          attempts: 0
        }
      })

      console.log(`📱 Código OTP para ${kp_id}: ${code}`)
      console.log(`   ID: ${otpRecord.id}, Expira em: ${expiresAt}`)
      
      return { code, expiresAt }
    } catch (error) {
      console.error('❌ Error generating OTP:', error)
      throw error
    }
  }

  async verifyOtp(kp_id, code, type = 'LOGIN') {
    try {
      console.log(`🔍 Verificando OTP para ${kp_id}: ${code} (${type})`)

      if (!code || code.length !== OTP_LENGTH) {
        console.log(`❌ Código inválido: ${code}`)
        throw new Error('Código inválido')
      }

      const otpRecord = await prisma.otpCode.findFirst({
        where: {
          kp_id,
          type,
          used: false,
          expires_at: {
            gt: new Date()
          }
        },
        orderBy: {
          created_at: 'desc'
        }
      })

      console.log(`📝 OTP encontrado: ${otpRecord ? 'SIM' : 'NÃO'}`)

      if (!otpRecord) {
        console.log('❌ Nenhum OTP válido encontrado')
        throw new Error('Código inválido ou expirado')
      }

      if (otpRecord.attempts >= OTP_MAX_ATTEMPTS) {
        console.log(`❌ Demasiadas tentativas (${otpRecord.attempts})`)
        await prisma.otpCode.update({
          where: { id: otpRecord.id },
          data: { used: true }
        })
        throw new Error('Muitas tentativas')
      }

      const isValid = await bcrypt.compare(code, otpRecord.code)
      console.log(`🔐 Código válido: ${isValid}`)

      if (!isValid) {
        console.log('❌ Código incorreto')
        await prisma.otpCode.update({
          where: { id: otpRecord.id },
          data: { attempts: { increment: 1 } }
        })
        throw new Error('Código inválido ou expirado')
      }

      await prisma.otpCode.update({
        where: { id: otpRecord.id },
        data: { used: true }
      })

      console.log('✅ OTP verificado com sucesso!')
      return { success: true, kp_id }
    } catch (error) {
      console.error('❌ Error verifying OTP:', error)
      throw error
    }
  }

  async requiresTwoFactor(kp_id) {
    try {
      const user = await prisma.account.findUnique({
        where: { kp_id }
      })
      
      if (user?.role === 'ADMIN' || user?.role === 'MERCHANT') {
        return true
      }
      
      return false
    } catch (error) {
      console.error('Error checking 2FA requirement:', error)
      return true
    }
  }
}

module.exports = new OtpService()
